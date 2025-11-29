/// <reference types="chai" />

declare global {
  export namespace Chai {
    interface Assertion {
      properAddress: Assertion;
    }
  }
}
