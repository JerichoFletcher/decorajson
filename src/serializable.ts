import { jsonatorClsTypeNameKey } from "./const";

type PropertyKey = string | symbol;
type Ctor = { new(...params: any[]): any };
type TypedCtor<T> = { new(...params: any[]): T };
type TypedFactory<T> = (obj: Record<string, any>) => T;

type SerializationMetadata = {
  serializedName: string,
  transform?: (val: any) => any;
  reviver?: (val: any) => any;
}

const typeReg = new Map<string, Ctor>();
const typeRegInv = new WeakMap<Ctor, string>();
const factoryReg = new WeakMap<Ctor, PropertyKey>();
const metaReg = new WeakMap<Ctor, Map<string, SerializationMetadata>>();

export function serializable<T extends Ctor>(param?: {
  typeName?: string,
}){
  return (target: T) => {
    const name = param?.typeName ?? target.name;

    if(typeReg.has(name)){
      throw new Error("Another class exists with the same type name");
    }

    Object.defineProperty(target.prototype, jsonatorClsTypeNameKey, { value: () => name });
    typeReg.set(name, target);
    typeRegInv.set(target, name);

    if(!metaReg.has(target)){
      metaReg.set(target, new Map());
    }
  };
}

export function serialize(param?: {
  serializedName?: string,
  transform?: (val: any) => any;
  reviver?: (val: any) => any;
}): PropertyDecorator{
  return (target: Object, propertyKey: PropertyKey) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

    if(!descriptor || (descriptor.get && descriptor.set)){
      const metadata: SerializationMetadata = { serializedName: param?.serializedName ?? propertyKey.toString() };
      metadata.transform = param?.transform;
      metadata.reviver = param?.reviver;

      const metaMap = metaReg.get(target.constructor as Ctor) || new Map<string, SerializationMetadata>();
      metaMap.set(propertyKey.toString(), metadata);
      metaReg.set(target.constructor as Ctor, metaMap);
    }else if(!!descriptor.get !== !!descriptor.set){
      throw new Error("Accessors decorated with @serialize must define both getter and setter");
    }else{
      throw new Error("@serialize can only be applied to properties and get/set accessors");
    }
  };
}

export function deserializer<T>(){
  return (target: TypedCtor<T>, propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<TypedFactory<T>>) => {
    if(!(target instanceof Function)){
      throw new Error("@deserialize can only be applied to static factory methods");
    }

    if(descriptor.get || descriptor.set){
      throw new Error("@deserializer can only be applied to static factory methods");
    }
    
    if(!descriptor.value){
      throw new Error("@deserializer can only be applied to static factory methods");
    }

    if(factoryReg.has(target)){
      throw new Error("Class already has another method decorated with @deserializer");
    }

    factoryReg.set(target, propertyKey);
  }
}

export function getConstructor(typeName: string): Ctor | null{
  return typeReg.get(typeName) ?? null;
}

export function getFactoryKey(typeName: string): PropertyKey | null{
  const ctor = getConstructor(typeName);
  if(!ctor){
    throw new Error("Class with the given type name is not decorated with @serializable");
  }

  return factoryReg.get(ctor) ?? null;
}

export function getSerializationMeta(instance: any): { typeName: string, metadata: Map<string, SerializationMetadata>}{
  if(!instance[jsonatorClsTypeNameKey]){
    throw new Error("Class of instance is not decorated with @serializable");
  }

  const typeName: string = instance[jsonatorClsTypeNameKey]();
  let type = typeReg.get(typeName);
  
  if(!type || !metaReg.has(type)){
    throw new Error("Class of instance is not decorated with @serializable");
  }

  const metadata = new Map<string, SerializationMetadata>();
  while(type !== Function.prototype){
    if(!metaReg.has(type)){
      throw new Error("Parent class of instance is not decorated with @serializable");
    }

    const currMetadata = metaReg.get(type)!;
    for(const [key, meta] of currMetadata){
      if(!metadata.has(key)){
        metadata.set(key, meta);
      }
    }

    type = Object.getPrototypeOf(type) as Ctor;
  }

  return { typeName, metadata };
}
