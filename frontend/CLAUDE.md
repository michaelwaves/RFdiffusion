@AGENTS.md

implement the frontend for a protein design chat interface with RFDIffusion and vercel AI sdk
The main chat agent should have vercel streaming, and call the subagent at localhost:8000/generate with the appropriate parameters as a "subagent" (implemented in the backend folder with fastapi)

the main chat window should take up the left half of the screen and is reminiscent of claude.ai, beautiful, minimalist, clean fonts. You can also add .pdb files (optionally)

On the right of the screen is a pv protein viewer and slider that allows the user to explore past iterations the subagent generated. Use the Vn folder structure in ../outputs/users/anonymous/default/62acb5be0856 for reference. The current subagent logs should be streamed to a console on the bottom right (modify backend if necessary)

The complete user flow would be have a dashboard that shows all chats, then click into a chat to continue, or have new chat button to start a chat. 

use shadcn components and inline tailwindcss. keep all styles super minimal, subtle, elegant. keep code clean and use red/green TDD. Keep tests super minimal