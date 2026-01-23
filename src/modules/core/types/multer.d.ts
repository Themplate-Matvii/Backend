declare module "multer" {
  import type { RequestHandler } from "express";

  export interface StorageEngine {}

  export interface Multer {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  export interface Options {
    storage?: StorageEngine;
    limits?: any;
    fileFilter?: any;
    preservePath?: boolean;
  }

  function multer(options?: Options): Multer;

  namespace multer {
    function memoryStorage(options?: any): StorageEngine;
    function diskStorage(options: any): StorageEngine;
  }

  export default multer;
}
