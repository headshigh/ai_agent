
import { Ollama } from "@langchain/ollama";
import { NextRequest } from "next/server";

export async function GET(req:NextRequest) {
    try {
        const ollama = new Ollama({
            model: "llama3.2",
            baseUrl: "http://localhost:11434",
        }); 

        const response = await ollama.invoke("Hello, world!");

        return Response.json(response);
    } catch (error:any) {
        console.log(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
