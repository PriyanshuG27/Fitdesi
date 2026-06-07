process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GROQ_API_KEY = 'test-groq-key';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HttpsError } = require('firebase-functions/v2/https');
const { verifyGymImage } = require('../verifyGymImage');

jest.mock('@google/generative-ai');
jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  return { HttpsError, onCall: jest.fn((opts, handler) => handler) };
});

describe('verifyGymImage Cloud Function', () => {
  let mockGenerateContent;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'yes'
      }
    });

    GoogleGenerativeAI.prototype.getGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'yes'
            }
          }
        ]
      }),
      text: async () => 'yes'
    });
  });

  it('1. Unauthenticated call -> throws HttpsError unauthenticated', async () => {
    await expect(verifyGymImage({ auth: null })).rejects.toThrow(
      new HttpsError('unauthenticated', 'Login required')
    );
  });

  it('2. Missing image -> throws HttpsError invalid-argument', async () => {
    await expect(verifyGymImage({ auth: { uid: 'user123' }, data: {} })).rejects.toThrow(
      new HttpsError('invalid-argument', 'Image data is required')
    );
  });

  it('3. Invalid image data format -> throws HttpsError invalid-argument', async () => {
    await expect(verifyGymImage({ auth: { uid: 'user123' }, data: { image: 'notbase64' } })).rejects.toThrow(
      new HttpsError('invalid-argument', 'Invalid image data format. Must be base64 Data URL.')
    );
  });

  it('4. Success on Gemini Flash (Primary)', async () => {
    const res = await verifyGymImage({
      auth: { uid: 'user123' },
      data: { image: 'data:image/jpeg;base64,abcdef' }
    });

    expect(res).toEqual({
      success: true,
      verified: true,
      modelUsed: 'gemini-flash-latest'
    });
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('5. Success on Gemini Flash returning no', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'no'
      }
    });

    const res = await verifyGymImage({
      auth: { uid: 'user123' },
      data: { image: 'data:image/jpeg;base64,abcdef' }
    });

    expect(res).toEqual({
      success: true,
      verified: false,
      modelUsed: 'gemini-flash-latest'
    });
  });

  it('6. Gemini Flash fails, fallback to Groq Vision success', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API quota exceeded'));

    const res = await verifyGymImage({
      auth: { uid: 'user123' },
      data: { image: 'data:image/jpeg;base64,abcdef' }
    });

    expect(res).toEqual({
      success: true,
      verified: true,
      modelUsed: 'llama-3.2-11b-vision-preview'
    });
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('7. Gemini Flash fails, Groq Vision returns no', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API quota exceeded'));
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'no'
            }
          }
        ]
      })
    });

    const res = await verifyGymImage({
      auth: { uid: 'user123' },
      data: { image: 'data:image/jpeg;base64,abcdef' }
    });

    expect(res).toEqual({
      success: true,
      verified: false,
      modelUsed: 'llama-3.2-11b-vision-preview'
    });
  });

  it('8. All models fail -> throws HttpsError internal', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini error'));
    global.fetch.mockRejectedValueOnce(new Error('Groq error'));

    await expect(
      verifyGymImage({
        auth: { uid: 'user123' },
        data: { image: 'data:image/jpeg;base64,abcdef' }
      })
    ).rejects.toThrow(HttpsError);
  });
});
