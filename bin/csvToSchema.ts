import { parse } from 'https://deno.land/std/flags/mod.ts';
import { readCSVObjects } from 'https://deno.land/x/csv/mod.ts';

// deno run -A ./bin/csvToSchema.ts --path test.csv

const { path } = parse(Deno.args);

const f = await Deno.open(path || './GBTA.csv');

const schema: any = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: '',
  type: 'object',
  properties: {
    modules: {
      description: '',
      type: 'object',
      properties: {},
    },
  },
  required: ['modules'],
  additionalProperties: false,
};

const types: any = {
  Text: 'string',
  Number: 'number',
  Date: 'string', // TODO: add format property
};

for await (const row of readCSVObjects(f)) {
  const name = row['Field Name'];
  const data = {
    field: row['Field'],
    description: row['Description'],
    type: types[row['Field Type']],
  };
  if (!schema.properties.modules.properties[row['Module']]) {
    schema.properties.modules.properties[row['Module']] = {
      description: '',
      type: 'object',
      properties: {},
    };
  }
  schema.properties.modules.properties[row['Module']].properties[name] = data;
  const match = row['Field Size'].match(/(\d+)/g);
  if (match?.[0])
    schema.properties.modules.properties[row['Module']].properties[
      name
    ].maxLength = parseInt(match[0]);
  if (match?.[1])
    schema.properties.modules.properties[row['Module']].properties[
      name
    ].minLength = parseInt(match[1]);
}

Deno.writeTextFileSync('./newSchema.json', JSON.stringify(schema));
