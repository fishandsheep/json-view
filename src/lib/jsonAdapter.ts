import type { ParseError } from "jsonc-parser";
import { FileFormat } from "../enums";

/** Parse any supported format into a plain JS value (dynamic-imported so the
 * parsers stay out of the initial bundle — performance guide). */
export const contentToJson = async (value: string, format = FileFormat.JSON): Promise<unknown> => {
  if (!value) return {};

  if (format === FileFormat.JSON) {
    const { parse } = await import("jsonc-parser");
    const errors: ParseError[] = [];
    const result = parse(value, errors);
    if (errors.length > 0) JSON.parse(value); // throw with a native SyntaxError
    return result;
  }

  if (format === FileFormat.YAML) {
    const { load } = await import("js-yaml");
    return load(value);
  }

  if (format === FileFormat.XML) {
    const { XMLParser } = await import("fast-xml-parser");
    const parser = new XMLParser({
      attributeNamePrefix: "$",
      ignoreAttributes: false,
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
    });
    return parser.parse(value);
  }

  if (format === FileFormat.CSV) {
    const { csv2json } = await import("json-2-csv");
    return csv2json(value, {
      trimFieldValues: true,
      trimHeaderFields: true,
      wrapBooleans: true,
      excelBOM: true,
    });
  }

  return {};
};

/** Serialize a JSON string into any supported format. */
export const jsonToContent = async (json: string, format: FileFormat): Promise<string> => {
  try {
    if (!json) return "";

    if (format === FileFormat.JSON) {
      return JSON.stringify(JSON.parse(json), null, 2);
    }

    if (format === FileFormat.YAML) {
      const { dump } = await import("js-yaml");
      const { parse } = await import("jsonc-parser");
      return dump(parse(json));
    }

    if (format === FileFormat.XML) {
      const { XMLBuilder } = await import("fast-xml-parser");
      const builder = new XMLBuilder({
        format: true,
        attributeNamePrefix: "$",
        ignoreAttributes: false,
      });
      return builder.build(JSON.parse(json));
    }

    if (format === FileFormat.CSV) {
      const { json2csv } = await import("json-2-csv");
      const parsedJson = JSON.parse(json);
      const data = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      return json2csv(data, {
        expandArrayObjects: true,
        expandNestedObjects: true,
        excelBOM: true,
        wrapBooleans: true,
        trimFieldValues: true,
        trimHeaderFields: true,
      });
    }

    return json;
  } catch (error) {
    console.error(json, error);
    return json;
  }
};
