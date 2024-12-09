import { deserializer, getSerializationMeta, serializable, serialize } from "@/serializable";
import JsonSerializer from "@/json-serializer";

const barKey = "serializedBar";
const msgTransform = (x: string) => `stored:${x}`;
const msgReviver = (y: string) => y.substring(7);

@serializable()
class A{
  @serialize()
  foo: number;

  constructor(foo: number){
    this.foo = foo;
  }

  @deserializer()
  static fromJSON(obj: Record<string, any>): A{
    return new A(obj.foo);
  }
}

@serializable()
class B extends A{
  @serialize({
    serializedName: barKey,
    transform: msgTransform,
    reviver: msgReviver,
  })
  bar: string;

  constructor(foo: number, bar: string){
    super(foo);
    this.bar = bar;
  }

  @deserializer()
  static fromJSON(obj: Record<string, any>): B{
    return new B(obj.foo, obj.bar);
  }
}

@serializable()
class C{
  @serialize()
  aaa: number;

  @serialize({ serializedName: "storedBbb" })
  bbb: number;
  
  @serialize({ transform: (val: number) => -val, reviver: (val: number) => -val })
  ccc: number;

  constructor(a: number, b: number, c: number){
    this.aaa = a;
    this.bbb = b;
    this.ccc = c;
  }
}

describe("Decorators for derived classes test", () => {
  test("Class members decorated with @serialize should have a corresponding entry in the serialization metadata registry", () => {
    const a = new A(9);
    const metaA = getSerializationMeta(a);

    expect(metaA).toBeDefined();
    expect(metaA!.metadata.has("foo")).toBeTruthy();
    expect(metaA!.metadata.has("bar")).toBeFalsy();
    
    const b = new B(12, "hello");
    const metaB = getSerializationMeta(b);

    expect(metaB).toBeDefined();
    expect(metaB!.metadata.has("foo")).toBeTruthy();
    expect(metaB!.metadata.has("bar")).toBeTruthy();
  });

  test("Serialize a derived class instance to JSON", () => {
    const msg = "Hello, World!";
    const b = new B(9, msg);

    const ser = new JsonSerializer();
    const obj = ser.serialize(b);

    expect(obj.foo).toBe(b.foo);
    expect(obj[barKey]).toBe(msgTransform(msg));
  });

  test("Deserialize a JSON object to a class instance using static factory", () => {
    const b = new B(9, "Hello, World!");
    
    const ser = new JsonSerializer();
    const obj = ser.serialize(b);

    const bDeser = ser.deserialize(obj) as B;

    expect(bDeser.foo).toBe(b.foo);
    expect(bDeser.bar).toBe(b.bar);
  });

  test("Deserialize a JSON object to a class instance using accessor setters", () => {
    const c = new C(3, 6, 9);

    const ser = new JsonSerializer();
    const obj = ser.serialize(c);

    const cDeser = ser.deserialize(obj) as C;

    expect(cDeser.aaa).toBe(c.aaa);
    expect(cDeser.bbb).toBe(c.bbb);
    expect(cDeser.ccc).toBe(c.ccc);
  });
});