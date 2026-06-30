"use client"
import { useEffect, useState } from "react"

type Source = {
    id: number
    name: string
    type: string
    status: string
}
export default function SourcesPage(){
    const [sources, setSources] = useState<Source[]>([])
    
    useEffect(() => {
        async function fetchSources() {
            const res = await fetch("http://127.0.0.1:8000/sources", {
                method: "GET",
                cache: "no-cache"
            })
            console.log(res)
            const data = await res.json()
            setSources(data)
        }
        fetchSources()
    }, [])
    
    return <>
        <div>
            {sources.map((source) => (
                <div key={source.id}>
                    <h2>{source.name}</h2>
                    <p>{source.type}</p>
                </div>
            ))}
        </div>
    </>
}