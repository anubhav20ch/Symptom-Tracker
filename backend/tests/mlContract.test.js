// TEST-4: ML Microservice Contract & Offline Fallback Suite
const request = require('supertest');
const app = require('../src/index');
const {
  extractSymptomFromText,
  predictDiseaseFromText,
  smartAnalyzeText
} = require('../src/services/nlpService');

describe('TEST-4: ML Service Contract & Fallback Verification', () => {
  let userToken;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'ML Contract User',
        email: `mlcontract-${Date.now()}@test.iso`,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    userToken = regRes.body.token;
  });

  describe('Contract Schema Verification', () => {
    it('verifies /api/nlp/extract endpoint handles symptom extraction gracefully without 500', async () => {
      const res = await request(app)
        .post('/api/nlp/extract')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Severe throbbing headache and photophobia' });

      expect(res.status).toBe(200);
      expect(res.body.success !== false).toBe(true);
      expect(res.body).toHaveProperty('extraction');
      expect(res.body.extraction).toHaveProperty('symptom');
      expect(res.body.extraction).toHaveProperty('suggested_severity');
      expect(res.body.extraction.suggested_severity).toBeGreaterThanOrEqual(1);
      expect(res.body.extraction.suggested_severity).toBeLessThanOrEqual(10);
    });

    it('verifies /api/nlp/smart-analyze returns valid numerical biomarkers and triage prediction', async () => {
      const res = await request(app)
        .post('/api/nlp/smart-analyze')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Feeling completely exhausted and stressed with shortness of breath' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('analysis');
      expect(res.body.analysis).toHaveProperty('extracted_numbers');
      expect(res.body.analysis).toHaveProperty('prediction');
      expect(res.body.analysis.prediction).toHaveProperty('classification_type');
      expect(['urgent', 'chronic', 'recurring', 'acute', 'routine']).toContain(res.body.analysis.prediction.classification_type);
    });
  });

  describe('Offline Microservice Fallback Resilience', () => {
    it('gracefully handles unreachable ML service without uncaught exceptions for symptom extraction', async () => {
      const result = await extractSymptomFromText('Chest pain radiating to left arm');
      expect(result).toBeDefined();
      expect(result.symptom).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.suggested_severity).toBeGreaterThanOrEqual(1);
      expect(result.extracted_keywords).toBeDefined();
    });

    it('gracefully handles smartAnalyzeText with rule-based numerical fallback when service is offline', async () => {
      const result = await smartAnalyzeText('I feel terrible pain in my chest 9 out of 10');
      expect(result).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.prediction.classification_type).toBeDefined();
      expect(['urgent', 'chronic', 'recurring', 'acute', 'routine']).toContain(result.prediction.classification_type);
      expect(result.extracted_numbers).toBeDefined();
      expect(result.extracted_numbers.pain_severity).toBeDefined();
    });

    it('gracefully handles predictDiseaseFromText without crashing application', async () => {
      const result = await predictDiseaseFromText('I have frequent fever and sweating');
      expect(result).toBeDefined();
      expect(result.disease).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });
});
