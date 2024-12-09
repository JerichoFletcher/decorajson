import { getConstructor, getFactoryKey, getSerializationMeta } from "@/serializable";
import { decorajsonObjTypeNameKey } from "./const";

export default class JsonSerializer{
  serialize(instance: any): Record<string, any>{
    const obj: Record<string, any> = {};
    const metaObj = getSerializationMeta(instance);

    if(!metaObj){
      throw new Error("Class of instance is not serializable");
    }

    const { typeName, metadata } = metaObj;

    for(const [key, propMeta] of metadata.entries()){
      const name = propMeta.serializedName ?? key;
      let value = instance[key];

      if(propMeta.transform){
        value = propMeta.transform(value);
      }

      obj[name] = value;
    }

    obj[decorajsonObjTypeNameKey] = typeName;
    return obj;
  }

  deserialize(obj: Record<string, any>): any{
    const typeName = obj[decorajsonObjTypeNameKey];
    if(!typeName){
      throw new Error("Object has no type information");
    }
    const ctor = getConstructor(typeName);
    if(!ctor){
      throw new Error("No type associated with the found type information");
    }
    const instance = new ctor();
    const metaObj = getSerializationMeta(ctor.prototype)!;

    if(!metaObj){
      throw new Error("Class of instance is not serializable");
    }

    const { metadata } = metaObj;
    const init = getFactoryKey(typeName);

    const mappedObj: Record<string, any> = {};
    for(const [key, propMeta] of metadata){
      const name = propMeta.serializedName;
      let value = obj[name];

      if(propMeta.reviver){
        value = propMeta.reviver(value);
      }

      mappedObj[key] = value;
    }

    if(init){
      return (ctor as any)[init](mappedObj);
    }

    for(const key of metadata.keys()){
      instance[key] = mappedObj[key];
    }

    return instance;
  }
}