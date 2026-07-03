import fs from 'fs';

export interface FaceMatchResult {
  isMatch: boolean;
  confidence: number; // 0 to 100
}

export interface IFaceRecognitionService {
  compareFaces(photoBuffer1: Buffer, photoBuffer2: Buffer): Promise<FaceMatchResult>;
}

export class AWSFaceRecognitionService implements IFaceRecognitionService {
  async compareFaces(photoBuffer1: Buffer, photoBuffer2: Buffer): Promise<FaceMatchResult> {
    // In production, this would call AWS Rekognition CompareFaces API:
    // const client = new RekognitionClient({ region: process.env.AWS_REGION });
    // const command = new CompareFacesCommand({ SourceImage: { Bytes: photoBuffer1 }, TargetImage: { Bytes: photoBuffer2 } });
    // const response = await client.send(command);
    // ...
    throw new Error('AWS Rekognition Service not configured in production settings.');
  }
}

export class MockFaceRecognitionService implements IFaceRecognitionService {
  async compareFaces(photoBuffer1: Buffer, photoBuffer2: Buffer): Promise<FaceMatchResult> {
    // A mock implementation:
    // If the buffers represent the same file path/content or we want to simulate a match,
    // we can return a high confidence. To make it interactive for testing, we can
    // check if either buffer is empty or if we just want a successful match by default (since they are mock images).
    // For demo purposes, we will return a high confidence (> 85%) 90% of the time,
    // or we can allow a custom header/flag from the client to simulate a mismatch for testing.
    
    // Simulating delay of real face matching network call
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple heuristic: if the buffers have the exact same size, they are probably the same mock picture
    const match = photoBuffer1.length === photoBuffer2.length || Math.random() > 0.15;
    
    if (match) {
      const confidence = 85.0 + Math.random() * 13.0; // 85% to 98%
      return {
        isMatch: confidence >= 80.0,
        confidence: parseFloat(confidence.toFixed(2))
      };
    } else {
      const confidence = 10.0 + Math.random() * 40.0; // 10% to 50%
      return {
        isMatch: false,
        confidence: parseFloat(confidence.toFixed(2))
      };
    }
  }
}

// Export the active provider
export const faceRecognitionService: IFaceRecognitionService = 
  process.env.FACE_PROVIDER === 'AWS' 
    ? new AWSFaceRecognitionService() 
    : new MockFaceRecognitionService();
