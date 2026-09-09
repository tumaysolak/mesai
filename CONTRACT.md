# MESAI shared implementation contract

A Turkish public observer dashboard for an autonomous fictional venture studio focused on energy efficiency and innovation. Independent personal experiment by Tümay Solak, no employer branding or CV personal details. All people fictional. Money/customers/revenue are explicitly simulated; downloadable artifacts are real. No sending messages, spending real funds, external commits or code execution by agents. LLM mode only when OPENAI_API_KEY configured; transparently labelled rules mode otherwise.

Node 24, ESM, Express, node:sqlite with DATABASE_PATH default data/mesai.db, persistent Railway /data/mesai.db. React + Vite + lucide-react. Root writes package.json/config/deployment/docs. Backend agent owns server/**. Frontend agent owns src/** + index.html. Reviewer owns tests/** and reviews, do not overlap.

## GET /api/state response
{
 company: {name:'MESAI Labs', mission:string, day:number, level:number, xp:number, nextLevelXp:number, cash:number, revenue:number, customers:number, reputation:number, morale:number},
 runtime: {mode:'rules'|'ai', provider:string, status:'idle'|'running'|'paused'|'error', phase:string, nextRunAt:string, timezone:'Europe/Istanbul', lastRunAt:string|null, dailyCallLimit:number, callsToday:number, error:string|null},
 agents: [{id:string,name:string,role:string,department:string,initials:string,color:string,status:string,task:string,backstory:string,motivation:string,fear:string,traits:[string],skills:[string],energy:number,morale:number,xp:number,level:number,memories:[{id:string,day:number,lesson:string,effect:string}]}],
 decisions: [{id:string,day:number,title:string,summary:string,rationale:string,status:'approved'|'rejected'|'completed',ownerId:string,category:string,votes:[{agentId:string,vote:'yes'|'no',reason:string}],expectedImpact:string,result:string|null,createdAt:string}],
 tasks: [{id:string,day:number,title:string,ownerId:string,status:'backlog'|'in_progress'|'done',type:string,progress:number,artifactId:string|null}],
 events: [{id:string,day:number,agentId:string|null,type:string,message:string,createdAt:string}],
 artifacts: [{id:string,day:number,title:string,description:string,type:'markdown'|'csv'|'html',ownerId:string,createdAt:string,downloadUrl:string,content:string}],
 history: [{day:number,cash:number,revenue:number,customers:number,reputation:number}],
 experiments:[{id:string,title:string,hypothesis:string,status:string,metric:string,result:string,lesson:string}],
 achievements:[{id:string,title:string,description:string,unlocked:boolean}],
 config:{scheduleHour:8,timezone:'Europe/Istanbul',autonomous:boolean}
}

Poll /api/state every 4s. Empty states supported. There is a real bootstrap rules cycle clearly labelled initial simulation (day 1) for a compelling populated dashboard. All seeded output must come from engine execution, not fabricated LLM activity.

GET /api/artifacts/:id downloads with attachment, MIME correct. HTML sandbox preview only, downloaded HTML is self contained. React renders all text safely, no unsanitized HTML injection.

POST /api/admin/run { } -> 202 starts one day, requires Authorization: Bearer ADMIN_TOKEN. POST /api/admin/pause {paused:boolean}. GET /api/admin/check validates owner token. Admin token is private, never embedded in frontend/repository/state. Public demo via POST /api/demo -> returns independently generated ephemeral rules simulation state, never modifies production DB or incurs AI calls. Can instead implement frontend replay of existing day if preferable. UI should provide 'Demoyu izle' which replays existing activity and clear 'Demo tekrar oynatılıyor' label.

Server daily schedule 08:00 Europe/Istanbul, durable date uniqueness and lease/lock, recovery after restart, no duplicate execution. Daily completion includes proposals, contrasting opinions/votes, selection/budget, assigned tasks, >=3 useful real artifacts, simulated market test, outcome, structured per-agent memory affecting future scoring, evolving metrics and XP. Persist partial events during cycle so observer sees work. Prevent indefinite growth (bounded recent state, history retained DB), expose errors without secrets. Health GET /api/health. Tests need deterministic exported clock or pure schedule helper and meaningful learning/idempotency assertions.
