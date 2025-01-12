
import "cheerio";
import { TogetherAIEmbeddings } from "@langchain/community/embeddings/togetherai";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import { NextRequest } from "next/server";

dotenv.config();

export async function GET(req:NextRequest) {
    try {
        //llm data + pdf files data == rag
        const pinecone = new PineconeClient();
        //@ts-expect-error
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
//create embedding
        const embeddings = new TogetherAIEmbeddings({
            model: "togethercomputer/m2-bert-80M-8k-retrieval", // Default value
        });
        //create a vector store
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex,
            // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
            maxConcurrency: 5,
        });

        //handle the text splitting only once
        /*         const loader = new CheerioWebBaseLoader(
            "https://lilianweng.github.io/posts/2023-06-23-agent/"
        );
        const docs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200,
        });
        const splits = await textSplitter.splitDocuments(docs);

        const numberIds = generateNumberStrings(splits.length);

        let saveToPinecone = await vectorStore.addDocuments(splits, {
            ids: numberIds,
        }); */

        const retriever = vectorStore.asRetriever({
            k: 15,
        });

        const prompt = ChatPromptTemplate.fromMessages([
            [
                "human",
                `You are an assistant for question-answering tasks. 
                    Use the following pieces of retrieved context to answer the question. 
                    If you don't know the answer, just say that you don't know.
                    Use three sentences maximum and keep the answer concise.
                    Question: {question} 
                    Context: {context} 
                    Answer:`,
            ],
        ]);

        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-pro",
            maxOutputTokens: 2048,
            apiKey: process.env.GOOGLE_API_KEY,
        });

        const ragChain = await createStuffDocumentsChain({
            llm: model,
            prompt,
            outputParser: new StringOutputParser(),
        });

        const retrievedDocs = await retriever.invoke(
            "what is task decomposition"
        );

        let resutls = await ragChain.invoke({
            question: "What is task decomposition?",
            context: retrievedDocs,
        });

        return Response.json({ retrievedDocs, resutls });
    } catch (error) {
        console.error(error);
        return Response.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

function generateNumberStrings(arrayLength:any) {
    return Array.from({ length: arrayLength }, (_, i) => (i + 1).toString());
}
