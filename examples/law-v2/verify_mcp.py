"""Verify GenU 5.5's stdio MCP connection without invoking a model or AWS."""

import asyncio
import json
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    config = json.loads(Path(__file__).with_name("mcp.local.json").read_text())
    server = config["mcpServers"]["law-v3"]
    parameters = StdioServerParameters(command=server["command"], args=server["args"])
    async with asyncio.timeout(90):
        async with stdio_client(parameters) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                names = {tool.name for tool in (await session.list_tools()).tools}
                expected = {
                    "list_law_datasets", "consult_law",
                    "get_law_consultation_result", "get_law_requirements",
                }
                if names != expected:
                    raise RuntimeError(f"Unexpected MCP tools: {sorted(names)}")
                result = await session.call_tool("list_law_datasets", {})
                if result.isError:
                    raise RuntimeError("Dataset lookup failed")
                print(json.dumps({"tools": sorted(names), "datasetLookup": "passed"}))


if __name__ == "__main__":
    asyncio.run(main())
