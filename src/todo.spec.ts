import { expect } from 'chai';
import inputJson from './input.json';
import outputJson from './output.json';
import { convertInput, validateOutput } from './todo';
import { Input } from './types/input';

describe('Todo', () => {
  // TODO: make sure this test passes
  it('Should be able to convert the input (flat lists) to the output (nested) structure', () => {
    const output = convertInput(inputJson as Input);

    expect(output.documents.length).to.equal(1);
    expect(output.documents[0].entities.length).to.equal(14);
    expect(output.documents[0].annotations.length).to.equal(9);
    expect(output).to.deep.equal(outputJson);
  });

  it('Should be able to validate the output json', () => {
    const output = convertInput(inputJson as Input);

    expect(validateOutput(output)).to.equal(true);

    output.documents[0].entities[0].children[0] = { testAttribute: true } as never;

    expect(validateOutput(output)).to.equal(false);
  });

  // BONUS: Write tests that validates the output json. Use the function you have written in "src/todo.ts".
});
