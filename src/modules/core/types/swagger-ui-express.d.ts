declare module "swagger-ui-express" {
  import { RequestHandler } from "express";

  export const serve: RequestHandler;

  export function setup(
    swaggerDoc: any,
    opts?: any,
    options?: any,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
  ): RequestHandler;
}
