import {
  analyzeSCurveRisk,
  generateExecutiveReport,
  parseRabWithGemini,
  auditRabItems,
  chatWithProjectAi,
} from './geminiService';

export async function handleGeminiApi(reqUrl: string, body: any) {
  const url = new URL(reqUrl, 'http://localhost');
  const pathname = url.pathname;

  switch (pathname) {
    case '/api/gemini/analyze-scurve':
      return await analyzeSCurveRisk(body);

    case '/api/gemini/generate-report':
      return await generateExecutiveReport(body);

    case '/api/gemini/parse-rab':
      return await parseRabWithGemini(body);

    case '/api/gemini/sanity-check':
      return await auditRabItems(body);

    case '/api/gemini/chat':
      return await chatWithProjectAi(body);

    default:
      throw new Error(`Endpoint ${pathname} tidak ditemukan.`);
  }
}
