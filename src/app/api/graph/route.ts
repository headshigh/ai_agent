
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();
//this is a graph state that consists of different nodes and edges for every question it keeps on calling the internet untill it gets the answeer
export async function GET(req:NextRequest) {
    try {
        const {searchParams}=new URL(req.url);
        const query=searchParams.get("q");
        //create a graph state which is a list of messages
        const GraphState = Annotation.Root({
            messages: Annotation({
                //it is a list of messages
                reducer: (x:any, y:any) => x.concat(y),
            }),
        });
//create a tool that searches the web
        const search = new TavilySearchResults({
            
            maxResults: 2,
        });

        //create a tool that gets the weather
        const weatherTool = tool(
            async ({ query }) => {
                if (
                    //if the query includes sf or san
                    query.toLowerCase().includes("sf") ||
                    query.toLowerCase().includes("san francisco")
                ) {
                    return "It's 60 degrees and foggy.";
                }
                return "It's 90 degrees and sunny.";
            },
            {
                name: "weather",
                description: "Call to get the current weather for a location.",
                schema: z.object({
                    query: z
                        .string()
                        .describe("The query to use in your search."),
                }),
            }
        );

        const tools = [search];
        const toolNode = new ToolNode(tools);
//create a model
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-pro",
            maxOutputTokens: 2048,
            apiKey: process.env.GOOGLE_API_KEY,
        }).bindTools(tools);

        //when it stop
        function shouldContinue(state:any) {
            const messages = state.messages;
            const lastMessage = messages[messages.length - 1];

            if (lastMessage.tool_calls?.length) {
                return "tools";
            }
            return "__end__";
        }
//call the model
        async function callModel(state:any) {
            const messages = state.messages;
            const response = await model.invoke(messages);

            return { messages: [response] };
        }
//create a workflow
        const workflow = new StateGraph(GraphState)
        //add a node that calls the model
            .addNode("agent", callModel)
            //add a node that calls the tools
            //@ts-expect-error
            .addNode("tools", toolNode)
            //add an edge that starts the workflow
            .addEdge("__start__", "agent")
            //add a conditional edge that checks if the agent should continue
            .addConditionalEdges("agent", shouldContinue)
            //add an edge that connects the tools to the agent
            .addEdge("tools", "agent");

        //create a checkpointer
        const checkpointer = new MemorySaver();

        //compile the workflow
        const app = workflow.compile({ checkpointer });
        //invoke the workflow
        const finalState = await app.invoke(
            {
                messages: [
                    new HumanMessage(`${query}`),
                ],
            },
            { configurable: { thread_id: "42" } }
        );

        return NextResponse.json({
            response: finalState.messages[finalState.messages.length - 1].content,
        });
    } catch (error:any) {   
        console.log(error);
        return NextResponse.json(error.message);
    }
}
