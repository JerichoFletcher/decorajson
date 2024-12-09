import { getSerializationMeta, serializable, serialize } from "@/serializable";

describe("Decorators validation test", () => {
  test("@serializable should reject duplicate type names", () => {
    expect(() => {
      @serializable({ typeName: "A" })
      class _{}

      @serializable({ typeName: "A" })
      class __{}
    }).toThrow();
  });

  test("@serialize should reject methods", () => {
    expect(() => {
      @serializable()
      class _{
        @serialize()
        dummy(): void{}
      }
    }).toThrow();
  });

  test("@serialize should reject get-only accessors", () => {
    expect(() => {
      @serializable()
      class _{
        @serialize()
        get dummy(): null{ return null; }
      }
    }).toThrow();
  });

  test("@serialize should reject set-only accessors", () => {
    expect(() => {
      @serializable()
      class _{
        @serialize()
        set dummy(_: any){}
      }
    }).toThrow();
  });

  test("Getting serialization metadata for classes not decorated with @serializable should throw", () => {
    expect(() => {
      class Z{}
      const b = new Z();
      getSerializationMeta(b);
    }).toThrow();
  });
});