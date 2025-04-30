Build effective agents with Model Context Protocol using simple, composable patterns.

Examples | Building Effective Agents | MCP

  discord Pepy Total Downloads 

Overview
mcp-agent is a simple, composable framework to build agents using Model Context Protocol.

Inspiration: Anthropic announced 2 foundational updates for AI application developers:

Model Context Protocol - a standardized interface to let any software be accessible to AI assistants via MCP servers.
Building Effective Agents - a seminal writeup on simple, composable patterns for building production-ready AI agents.
mcp-agent puts these two foundational pieces into an AI application framework:

It handles the pesky business of managing the lifecycle of MCP server connections so you don't have to.
It implements every pattern described in Building Effective Agents, and does so in a composable way, allowing you to chain these patterns together.
Bonus: It implements OpenAI's Swarm pattern for multi-agent orchestration, but in a model-agnostic way.
Altogether, this is the simplest and easiest way to build robust agent applications. Much like MCP, this project is in early development. We welcome all kinds of contributions, feedback and your help in growing this to become a new standard.

Get Started
We recommend using uv to manage your Python projects:

uv add "mcp-agent"
Alternatively:

pip install mcp-agent
Quickstart
Tip

The examples directory has several example applications to get started with. To run an example, clone this repo, then:

cd examples/mcp_basic_agent # Or any other example
cp mcp_agent.secrets.yaml.example mcp_agent.secrets.yaml # Update API keys
uv run main.py
Here is a basic "finder" agent that uses the fetch and filesystem servers to look up a file, read a blog and write a tweet. Example link:

finder_agent.py
import asyncio
import os

from mcp_agent.app import MCPApp
from mcp_agent.agents.agent import Agent
from mcp_agent.workflows.llm.augmented_llm_openai import OpenAIAugmentedLLM

app = MCPApp(name="hello_world_agent")

async def example_usage():
    async with app.run() as mcp_agent_app:
        logger = mcp_agent_app.logger
        # This agent can read the filesystem or fetch URLs
        finder_agent = Agent(
            name="finder",
            instruction="""You can read local files or fetch URLs.
                Return the requested information when asked.""",
            server_names=["fetch", "filesystem"], # MCP servers this Agent can use
        )

        async with finder_agent:
            # Automatically initializes the MCP servers and adds their tools for LLM use
            tools = await finder_agent.list_tools()
            logger.info(f"Tools available:", data=tools)

            # Attach an OpenAI LLM to the agent (defaults to GPT-4o)
            llm = await finder_agent.attach_llm(OpenAIAugmentedLLM)

            # This will perform a file lookup and read using the filesystem server
            result = await llm.generate_str(
                message="Show me what's in README.md verbatim"
            )
            logger.info(f"README.md contents: {result}")

            # Uses the fetch server to fetch the content from URL
            result = await llm.generate_str(
                message="Print the first two paragraphs from https://www.anthropic.com/research/building-effective-agents"
            )
            logger.info(f"Blog intro: {result}")

            # Multi-turn interactions by default
            result = await llm.generate_str("Summarize that in a 128-char tweet")
            logger.info(f"Tweet: {result}")

if __name__ == "__main__":
    asyncio.run(example_usage())
mcp_agent.config.yaml
Agent output
Table of Contents
Why use mcp-agent?
Example Applications
Claude Desktop
Streamlit
Gmail Agent
RAG
Marimo
Python
Swarm (CLI)
Core Concepts
Workflows Patterns
Augmented LLM
Parallel
Router
Intent-Classifier
Orchestrator-Workers
Evaluator-Optimizer
OpenAI Swarm
Advanced
Composing multiple workflows
Signaling and Human input
App Config
MCP Server Management
Contributing
Roadmap
FAQs
Why use mcp-agent?
There are too many AI frameworks out there already. But mcp-agent is the only one that is purpose-built for a shared protocol - MCP. It is also the most lightweight, and is closer to an agent pattern library than a framework.

As more services become MCP-aware, you can use mcp-agent to build robust and controllable AI agents that can leverage those services out-of-the-box.

Examples
Before we go into the core concepts of mcp-agent, let's show what you can build with it.

In short, you can build any kind of AI application with mcp-agent: multi-agent collaborative workflows, human-in-the-loop workflows, RAG pipelines and more.

Claude Desktop
You can integrate mcp-agent apps into MCP clients like Claude Desktop.

mcp-agent server
This app wraps an mcp-agent application inside an MCP server, and exposes that server to Claude Desktop. The app exposes agents and workflows that Claude Desktop can invoke to service of the user's request.

 mcp-agent-server-demo.mp4 
This demo shows a multi-agent evaluation task where each agent evaluates aspects of an input poem, and then an aggregator summarizes their findings into a final response.

Details: Starting from a user's request over text, the application:

dynamically defines agents to do the job
uses the appropriate workflow to orchestrate those agents (in this case the Parallel workflow)
Link to code: examples/mcp_agent_server

Note

Huge thanks to Jerron Lim (@StreetLamb) for developing and contributing this example!

Streamlit
You can deploy mcp-agent apps using Streamlit.

Gmail agent
This app is able to perform read and write actions on gmail using text prompts -- i.e. read, delete, send emails, mark as read/unread, etc. It uses an MCP server for Gmail.

 Screen.Recording.2025-01-28.at.7.37.24.PM.mov 
Link to code: gmail-mcp-server

Note

Huge thanks to Jason Summer (@jasonsum) for developing and contributing this example!

Simple RAG Chatbot
This app uses a Qdrant vector database (via an MCP server) to do Q&A over a corpus of text.

 streamlit-mcp-rag-agent-demo.mp4 
Link to code: examples/streamlit_mcp_rag_agent

Note

Huge thanks to Jerron Lim (@StreetLamb) for developing and contributing this example!

Marimo
Marimo is a reactive Python notebook that replaces Jupyter and Streamlit. Here's the "file finder" agent from Quickstart implemented in Marimo:


Link to code: examples/marimo_mcp_basic_agent

Note

Huge thanks to Akshay Agrawal (@akshayka) for developing and contributing this example!

Python
You can write mcp-agent apps as Python scripts or Jupyter notebooks.

Swarm
This example demonstrates a multi-agent setup for handling different customer service requests in an airline context using the Swarm workflow pattern. The agents can triage requests, handle flight modifications, cancellations, and lost baggage cases.

 swarm_flight_support.mov 
Link to code: examples/workflow_swarm

Core Components
The following are the building blocks of the mcp-agent framework:

MCPApp: global state and app configuration
MCP server management: gen_client and MCPConnectionManager to easily connect to MCP servers.
Agent: An Agent is an entity that has access to a set of MCP servers and exposes them to an LLM as tool calls. It has a name and purpose (instruction).
AugmentedLLM: An LLM that is enhanced with tools provided from a collection of MCP servers. Every Workflow pattern described below is an AugmentedLLM itself, allowing you to compose and chain them together.
Everything in the framework is a derivative of these core capabilities.

Workflows
mcp-agent provides implementations for every pattern in Anthropic’s Building Effective Agents, as well as the OpenAI Swarm pattern. Each pattern is model-agnostic, and exposed as an AugmentedLLM, making everything very composable.

AugmentedLLM
AugmentedLLM is an LLM that has access to MCP servers and functions via Agents.

LLM providers implement the AugmentedLLM interface to expose 3 functions:

generate: Generate message(s) given a prompt, possibly over multiple iterations and making tool calls as needed.
generate_str: Calls generate and returns result as a string output.
generate_structured: Uses Instructor to return the generated result as a Pydantic model.
Additionally, AugmentedLLM has memory, to keep track of long or short-term history.

Example
Parallel
Parallel workflow (Image credit: Anthropic)

Fan-out tasks to multiple sub-agents and fan-in the results. Each subtask is an AugmentedLLM, as is the overall Parallel workflow, meaning each subtask can optionally be a more complex workflow itself.

Note

Link to full example

Example
Router
Router workflow (Image credit: Anthropic)

Given an input, route to the top_k most relevant categories. A category can be an Agent, an MCP server or a regular function.

mcp-agent provides several router implementations, including:

EmbeddingRouter: uses embedding models for classification
LLMRouter: uses LLMs for classification
Note

Link to full example

Example
IntentClassifier
A close sibling of Router, the Intent Classifier pattern identifies the top_k Intents that most closely match a given input. Just like a Router, mcp-agent provides both an embedding and LLM-based intent classifier.

Evaluator-Optimizer
Evaluator-optimizer workflow (Image credit: Anthropic)

One LLM (the “optimizer”) refines a response, another (the “evaluator”) critiques it until a response exceeds a quality criteria.

Note

Link to full example

Example
Orchestrator-workers
Orchestrator workflow (Image credit: Anthropic)

A higher-level LLM generates a plan, then assigns them to sub-agents, and synthesizes the results. The Orchestrator workflow automatically parallelizes steps that can be done in parallel, and blocks on dependencies.

Note

Link to full example

Example
Swarm
OpenAI has an experimental multi-agent pattern called Swarm, which we provide a model-agnostic reference implementation for in mcp-agent.



The mcp-agent Swarm pattern works seamlessly with MCP servers, and is exposed as an AugmentedLLM, allowing for composability with other patterns above.

Note

Link to full example

Example
Advanced
Composability
An example of composability is using an Evaluator-Optimizer workflow as the planner LLM inside the Orchestrator workflow. Generating a high-quality plan to execute is important for robust behavior, and an evaluator-optimizer can help ensure that.

Doing so is seamless in mcp-agent, because each workflow is implemented as an AugmentedLLM.

Example
Signaling and Human Input
Signaling: The framework can pause/resume tasks. The agent or LLM might “signal” that it needs user input, so the workflow awaits. A developer may signal during a workflow to seek approval or review before continuing with a workflow.

Human Input: If an Agent has a human_input_callback, the LLM can call a __human_input__ tool to request user input mid-workflow.

Example
App Config
Create an mcp_agent.config.yaml and a gitignored mcp_agent.secrets.yaml to define MCP app configuration. This controls logging, execution, LLM provider APIs, and MCP server configuration.

MCP server management
mcp-agent makes it trivial to connect to MCP servers. Create an mcp_agent.config.yaml to define server configuration under the mcp section:

mcp:
  servers:
    fetch:
      command: "uvx"
      args: ["mcp-server-fetch"]
      description: "Fetch content at URLs from the world wide web"
gen_client
Manage the lifecycle of an MCP server within an async context manager:

from mcp_agent.mcp.gen_client import gen_client

async with gen_client("fetch") as fetch_client:
    # Fetch server is initialized and ready to use
    result = await fetch_client.list_tools()

# Fetch server is automatically disconnected/shutdown
The gen_client function makes it easy to spin up connections to MCP servers.

Persistent server connections
In many cases, you want an MCP server to stay online for persistent use (e.g. in a multi-step tool use workflow). For persistent connections, use:

connect and disconnect
from mcp_agent.mcp.gen_client import connect, disconnect

fetch_client = None
try:
     fetch_client = connect("fetch")
     result = await fetch_client.list_tools()
finally:
     disconnect("fetch")
MCPConnectionManager For even more fine-grained control over server connections, you can use the MCPConnectionManager.
Example
MCP Server Aggregator
MCPAggregator acts as a "server-of-servers". It provides a single MCP server interface for interacting with multiple MCP servers. This allows you to expose tools from multiple servers to LLM applications.

Example
Contributing
We welcome any and all kinds of contributions. Please see the CONTRIBUTING guidelines to get started.

Special Mentions
There have already been incredible community contributors who are driving this project forward:

Shaun Smith (@evalstate) -- who has been leading the charge on countless complex improvements, both to mcp-agent and generally to the MCP ecosystem.
Jerron Lim (@StreetLamb) -- who has contributed countless hours and excellent examples, and great ideas to the project.
Jason Summer (@jasonsum) -- for identifying several issues and adapting his Gmail MCP server to work with mcp-agent
Roadmap
We will be adding a detailed roadmap (ideally driven by your feedback). The current set of priorities include:

Durable Execution -- allow workflows to pause/resume and serialize state so they can be replayed or be paused indefinitely. We are working on integrating Temporal for this purpose.
Memory -- adding support for long-term memory
Streaming -- Support streaming listeners for iterative progress
Additional MCP capabilities -- Expand beyond tool calls to support:
Resources
Prompts
Notifications
FAQs
What are the core benefits of using mcp-agent?
mcp-agent provides a streamlined approach to building AI agents using capabilities exposed by MCP (Model Context Protocol) servers.

MCP is quite low-level, and this framework handles the mechanics of connecting to servers, working with LLMs, handling external signals (like human input) and supporting persistent state via durable execution. That lets you, the developer, focus on the core business logic of your AI application.

Core benefits:

🤝 Interoperability: ensures that any tool exposed by any number of MCP servers can seamlessly plug in to your agents.
⛓️ Composability & Cutstomizability: Implements well-defined workflows, but in a composable way that enables compound workflows, and allows full customization across model provider, logging, orchestrator, etc.
💻 Programmatic control flow: Keeps things simple as developers just write code instead of thinking in graphs, nodes and edges. For branching logic, you write if statements. For cycles, use while loops.
🖐️ Human Input & Signals: Supports pausing workflows for external signals, such as human input, which are exposed as tool calls an Agent can make.