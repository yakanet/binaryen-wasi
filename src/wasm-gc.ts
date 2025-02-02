// import {default as binaryen} from "binaryen";
import binaryen, { type Pointer } from './binaryen_ext';

import fs from 'node:fs'

function alloc(size: number) {
  const ptr = binaryen._malloc(size);
  return {
    ptr,
    [Symbol.dispose]: () => binaryen._free(ptr)
  }
}

function allocU32Array(u32s: number[]) {
    const ptr = binaryen._malloc(u32s.length << 2);
    let offset = ptr;
    for (let i = 0; i < u32s.length; i++) {
      const value = u32s[i];
      binaryen.__i32_store(offset, value);
      offset = ((offset as number) + 4) as Pointer;
    }
    return {
        ptr,
        [Symbol.dispose]: () => binaryen._free(ptr)
    }
  }
  const module = new binaryen.Module();
  const tempStructIndex = 0;
  const typeBuilder = binaryen._TypeBuilderCreate(1);
  // I always use temps so that I can potentially create recursive types.
  const tempStructHeapType = binaryen._TypeBuilderGetTempHeapType(typeBuilder, tempStructIndex);
  
  
  const fieldTypes = [binaryen.i32, binaryen.f32];
  using cFieldTypes = allocU32Array(fieldTypes);
  using cFieldPackedTypes = allocU32Array(fieldTypes.map(() => binaryen._BinaryenPackedTypeNotPacked()));
  using cFieldMutables = allocU32Array(fieldTypes.map(() => 1));
  binaryen._TypeBuilderSetStructType(
    typeBuilder,
    tempStructIndex,
    cFieldTypes.ptr,
    cFieldPackedTypes.ptr,
    cFieldMutables.ptr,
    fieldTypes.length
  );
  
  const size = binaryen._TypeBuilderGetSize(typeBuilder);
  using out = alloc(Math.max(4 * size, 8));
  if (!binaryen._TypeBuilderBuildAndDispose(typeBuilder, out.ptr, out.ptr, out.ptr + 4)) {
    throw new Error('_TypeBuilderBuildAndDispose failed');
  }

  using structNewArgs = allocU32Array([module.i32.const(1337), module.f32.const(10)]);
  const structNew = binaryen._BinaryenStructNew(module, structNewArgs.ptr, 2, tempStructHeapType);
  
  module.addFunction(
    '_start',
    binaryen.createType([]),
    binaryen.f32,
    [],
    module.block(null, [
      //structNew,
      binaryen._BinaryenStructGet(module, 1, structNew, binaryen.f32, false)
    ])
  );
  
  module.addFunctionExport('_start', '_start');

  console.log(module.emitText())
  fs.writeFileSync('build/wasm-gc.wasm', module.emitBinary());
  