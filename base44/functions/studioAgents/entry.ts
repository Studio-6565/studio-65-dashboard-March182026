import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AGENTS = {
  callSheet: {
    name: 'Call Sheet Generator',
    system: `You are a professional film/photo production coordinator for Studio 65. Generate a complete, ready-to-send call sheet based on the project data provided. Format it clearly with sections for: Project Overview, Date/Time/Location, Point of Contact, Crew List with roles, Camera Setup, Shot Notes, and any important reminders. Make it professional and concise.`,
  },
  invoice: {
    name: 'Invoice Writer',
    system: `You are a professional billing assistant for Studio 65, a video/photo production studio. Write a clean, professional invoice email or invoice body based on the project data provided. Include: invoice number, client name, project name, line items (production fee, crew costs, rental costs, expenses), total, payment terms, and a polite closing. Be professional and clear.`,
  },
  pricing: {
    name: 'Pricing Advisor',
    system: `You are a business pricing advisor for Studio 65, a video/photo production studio. Based on the studio's past project data provided, analyze pricing trends and give a specific recommended price range for the described project. Consider: project type, duration, crew needed, complexity, and market rates. Be specific with dollar amounts and explain your reasoning concisely.`,
  },
  expenses: {
    name: 'Expense Categorizer',
    system: `You are a bookkeeping assistant for Studio 65. Given a description of an expense or receipt, categorize it into one of: Travel, Food, Props, Software, Printing, Other. Return JSON in this format: {"category": "...", "suggested_description": "...", "amount_hint": "..."} with a brief clean description suitable for expense tracking. If multiple items, return an array.`,
  },
  crewMatcher: {
    name: 'Crew Matcher',
    system: `You are a production staffing assistant for Studio 65. Based on the project requirements and the available contacts/crew in the studio's database, recommend the best crew members for the job. Explain why each person is a good fit based on their role, skills, rate, and availability. Be specific and practical.`,
  },
  onboardingScreener: {
    name: 'Onboarding Screener',
    system: `You are a talent/client screener for Studio 65. Review the onboarding request data provided and give a structured assessment: 1) Overall fit (Strong/Moderate/Weak), 2) Key positives, 3) Any red flags or missing info, 4) Recommended action (Approve/Follow up/Pass), 5) A suggested response message the studio could send to this person. Be brief and practical.`,
  },
  followUp: {
    name: 'Client Follow-up Agent',
    system: `You are a client relations assistant for Studio 65. Draft professional, friendly follow-up emails for the given projects/clients. These could be: payment follow-ups for unpaid invoices, delivery check-ins, feedback requests, or rebooking outreach. Tailor the tone to the context. Write the full email ready to copy-paste, with subject line.`,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent, prompt, context } = await req.json();

    const agentConfig = AGENTS[agent];
    if (!agentConfig) return Response.json({ error: 'Unknown agent' }, { status: 400 });

    const fullPrompt = `${agentConfig.system}

Today's date: ${new Date().toISOString().split('T')[0]}

--- STUDIO DATA ---
${context || 'No data provided.'}
--- END STUDIO DATA ---

User request: ${prompt}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ result: response, agentName: agentConfig.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});