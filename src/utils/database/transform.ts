import { Schema } from "mongoose";

interface SchemaTransformOptions {
  removeFields?: string[];
}

const buildTransform = (options?: SchemaTransformOptions) => {
  return (_: unknown, ret: Record<string, any>) => {
    if (ret._id !== undefined) {
      ret.id = typeof ret._id === "string" ? ret._id : ret._id?.toString?.();
      delete ret._id;
    }

    if (options?.removeFields?.length) {
      for (const field of options.removeFields) {
        delete ret[field];
      }
    }

    return ret;
  };
};

export const applyDefaultSchemaTransform = <T>(
  schema: Schema<T>,
  options?: SchemaTransformOptions,
) => {
  const transform = buildTransform(options);

  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform,
  });

  schema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform,
  });
};
