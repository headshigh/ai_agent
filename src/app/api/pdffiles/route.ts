import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export async function GET(req:NextRequest){
    const loader = new PDFLoader("public/demo.pdf");
    const docs=await loader.load();
    const splitter=new RecursiveCharacterTextSplitter({chunkSize:1000,chunkOverlap:200});
    const chunks=await splitter.splitDocuments(docs);
       /*    const numberIds = generateNumberStrings(splits.length);

    let saveToPinecone = await vectorStore.addDocuments(splits, {
        ids: numberIds,
    }); */
    return NextResponse.json(chunks);
}   
