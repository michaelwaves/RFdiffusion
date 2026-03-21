so i wanna turn the claude sdk.py in api into a fastapi in api/server.py for a chat interface over rf diffusion

it takes input requests in the form of english, creates a new fastapi background task with claude running scripts to generate the protein, and outputs pdb files and images to disk

The idea is some kind of collaborative human/AI protein design via chat and run management/visualization dashboard that will be eventually a nextjs app frontend. Users will chat with vercel ai sdk agent to do research, get reference protein pdbs (optionally), and issue high level commands. ie i want a protein with 4 alpha helices and a beta strip. The vercel chat will then send a request to this api (essentially a subagent) and the api will return like job queued or something. (also expose an endpoint to see current jobs, to display in frontend).

for now, save the artifacts to /outputs/users/user_id/chat_id or some other structure that makes sense, so it's easy to navigate later

the end goal is the user is able to "time travel" thru ai and user iterated pdbs in the frontend to see how it evolved over time

The cool part is claude agent sdk can iterate on designs since it's a vlm and can render and see what it created. so it has a max iterations parameter too. 

A tricky thing might be prompt engineering the claude sdk agent to be consistent, not go past max iterations, learn how to properly use the tools and configs in this RFDiffusion repo (which is in config/inference). Checkout the examples in /workspace for prompt engineering examples. maybe have some skills.md the agent can read? 

first, make a plan.md in this directory. Do NOT use plan mode. Let's iterate togehter. Good luck, have fun!