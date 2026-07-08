/**
 * receive the http request
 * read route parameters
 * call service function
 * return json response
 * convert errors into http errors
 */

import { fetchRawDocsWithWorker } from "@/server/services/ingestions/ingestion-worker-service"
import { NextResponse } from "next/server"

export const runtime = "nodejs";

export async function POST(
    request: Request,
    context: { params: Promise<{runId: string}>}
){
    try {
        // extract input
        const {runId} = await context.params
        // call service function
        const res = await fetchRawDocsWithWorker(runId)
        // return succcess response   
        return NextResponse.json ({
            success: true,
            data: res,
        }) 
    } catch (error) {
        // log error
        console.error("Post fetch-raw with worker failed", error);
        // return error response
        return NextResponse.json({
            success: false,
            error: "Failed to fetch raw documents with worker"
        }, {status: 500})

    }
}