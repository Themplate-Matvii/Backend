import { S3 } from "@aws-sdk/client-s3";
import { ENV } from "@config/env";

export const b2 = new S3({
  endpoint: ENV.B2_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: ENV.B2_KEY_ID,
    secretAccessKey: ENV.B2_APP_KEY,
  },
});
