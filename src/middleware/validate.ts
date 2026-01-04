import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

type ValidateSchema = {
  body?: ZodObject<any>;
  query?: ZodObject<any>;
  params?: ZodObject<any>;
  headers?: ZodObject<any>;
};

export const validate = (schema: ValidateSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) return handleError(res, req, result.error);
        req.body = result.data;
      }

      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) return handleError(res, req, result.error);
        req.query = result.data as any;
      }

      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) return handleError(res, req, result.error);
        req.params = result.data as any;
      }

      if (schema.headers) {
        const result = schema.headers.safeParse(req.headers);
        if (!result.success) return handleError(res, req, result.error);
        req.headers = result.data as any;
      }

      return next();
    } catch (err) {
      return res.status(500).json({ error: "Validation middleware error" });
    }
  };
};

function handleError(res: Response, req: Request, error: ZodError) {
  const t = req.t ?? ((s: string) => s);
  const errors = error.issues.map((err) => {
    let key = String(err.message);
    let params: Record<string, any> = {};
    if (key.includes("|")) {
      const [k, raw] = key.split("|");
      key = k;
      try {
        params = JSON.parse(raw);
      } catch {}
    }
    return { path: err.path.join("."), message: t(key, params) };
  });
  return res.status(400).json({ errors });
}
