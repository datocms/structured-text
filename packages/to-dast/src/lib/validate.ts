import fs from 'fs';
import * as tsj from 'ts-json-schema-generator';
import { validate as jsonSchemaValidate } from 'jsonschema';
import { Root as DastTree } from '../../types/dast.d';

export function generateSchema() {
  const config = {
    path: './types/dast.d.ts',
    tsconfig: './tsconfig.json',
    type: 'Root', // Or <type-name> if you want to generate schema for that one type only
  };

  const schema = tsj.createGenerator(config).createSchema(config.type);
  return schema;
}

const validate = (function generateValidate() {
  const schema = generateSchema();
  return function validate(dast: DastTree): boolean {
    const result = jsonSchemaValidate(dast, schema, { nestedErrors: true });
    if (result.errors.length) {
      console.error(
        JSON.stringify(
          result.errors.map((e) => e.stack),
          null,
          2,
        ),
      );
    }
    return result.valid;
  };
})();

export default validate;

export function write() {
  fs.writeFileSync('./schema.json', JSON.stringify(generateSchema(), null, 2));
}
