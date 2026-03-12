import { GoogleGenAI, Type } from "@google/genai";
import { WordEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getWordDefinition(word: string, context: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the word "${word}" in the context of this sentence: "${context}".
    Provide the definition, syllable breakdown, part of speech, and a relatable analogy for an Indian student (aged 14-22).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING, description: "Clear definition of the word in context." },
          syllableBreakdown: { type: Type.STRING, description: "Syllable breakdown, e.g., 'vo-cab-u-lar-y'." },
          partOfSpeech: { type: Type.STRING, description: "Part of speech, e.g., 'Noun'." },
          analogy: { type: Type.STRING, description: "A relatable analogy for an Indian student." }
        },
        required: ["definition", "syllableBreakdown", "partOfSpeech", "analogy"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeVisualElement(imageBase64: string, prompt: string = "Explain the main image, diagram, or visual element in this picture. If there is a specific highlighted area, focus on that.") {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.split(',')[1] // remove data:image/jpeg;base64,
        }
      },
      { text: prompt }
    ]
  });
  return response.text;
}

export async function explainWord(word: string, prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text || "Could not generate explanation.";
}

export async function gradeFeynmanExplanation(word: string, definition: string, explanation: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The word is "${word}" with definition: "${definition}".
    The student explained it as: "${explanation}".
    Grade this explanation from 0 to 100 on how well they understand the core concept. Provide brief, constructive feedback identifying any gaps in their understanding.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Score from 0 to 100." },
          feedback: { type: Type.STRING, description: "Constructive feedback." }
        },
        required: ["score", "feedback"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateQuest(words: WordEntry[]) {
  const wordList = words.map(w => w.word).join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Create a 5-scene branching RPG adventure story using these vocabulary words: ${wordList}.
    The story should be engaging, dark fantasy or sci-fi, and weave the words naturally into the narrative.
    The player makes choices at the end of each scene.
    Some choices should lead to a knowledge-check mini-quiz about one of the words.
    Return the story as a JSON array of scenes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING, description: "The narrative text for this scene. Highlight the vocabulary words." },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  nextSceneId: { type: Type.STRING },
                  isQuiz: { type: Type.BOOLEAN, description: "True if this choice triggers a quiz." },
                  quizWord: { type: Type.STRING, description: "The word being tested if isQuiz is true." },
                  quizQuestion: { type: Type.STRING },
                  quizOptions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  quizCorrectAnswer: { type: Type.STRING }
                },
                required: ["text", "nextSceneId"]
              }
            }
          },
          required: ["id", "text", "choices"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function generateExitQuiz(words: WordEntry[], type: 'mcq' | 'crossword' | 'feynman') {
  const wordList = words.map(w => w.word).join(", ");
  
  let prompt = "";
  let schema: any = {};

  if (type === 'mcq') {
    prompt = `Create a multiple choice question for one of these words: ${wordList}. Provide the definition as the question, and 4 word options.`;
    schema = {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING }
      },
      required: ["question", "options", "correctAnswer"]
    };
  } else if (type === 'crossword') {
    prompt = `Create a crossword clue for one of these words: ${wordList}.`;
    schema = {
      type: Type.OBJECT,
      properties: {
        clue: { type: Type.STRING },
        answer: { type: Type.STRING }
      },
      required: ["clue", "answer"]
    };
  } else {
    prompt = `Select one word from this list for a Feynman challenge: ${wordList}.`;
    schema = {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING }
      },
      required: ["word"]
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}
