import binaryen from "binaryen";
import fs from "node:fs/promises";
import process from "node:process";
import { addWasiFunction } from "./wasi";
const encoder = new TextEncoder();

const module = new binaryen.Module();

{
  using time = benchmark('building ast')

  //module.setFeatures(binaryen.Features.SIMD128);
  //module.setFeatures(binaryen.Features.Strings);
  addWasiFunction(module);

  // Memory

  {
    module.addFunction(
      "main:add",
      binaryen.createType([binaryen.i32, binaryen.i32]),
      binaryen.i32,
      [],
      module.return(
        module.i32.add(
          module.local.get(0, binaryen.i32),
          module.local.get(1, binaryen.i32)
        )
      )
    );
    module.addFunctionExport("main:add", "add");
  }

  {
    module.setMemory(1, -1, "memory", [
      {
        data: encoder.encode("Hello world\n\0"),
        offset: module.i32.const(0),
      },
    ]);
    const funct = module.addFunction(
      "main:say_hello",
      binaryen.none,
      binaryen.none,
      [],
      module.block(null, [
        // Store iovs
        module.i32.store(0, 0, module.i32.const(40), module.i32.const(0)), // Start of data (= *buf)
        module.i32.store(0, 0, module.i32.const(44), module.i32.const(12)), // Length of data (= buf_len)

        // Calling fd_write
        module.drop(
          module.call(
            "wasi_snapshot_preview1:fd_write",
            [
              module.i32.const(1), // stdout = 1
              module.i32.const(40), // ptr of iovs
              module.i32.const(1), // number of iovs (could iovs is an array)
              module.i32.const(80), // where to store the returned error code
            ],
            binaryen.i32
          )
        ),
      ])
    );
  }

  {
    const funct = module.addFunction(
      "_start",
      binaryen.none,
      binaryen.none,
      [],
      module.block(null, [
        module.call("main:say_hello", [], binaryen.none),
        module.call(
          "wasi_snapshot_preview1:proc_exit",
          [module.i32.const(0)],
          binaryen.none
        ),
      ])
    );
    //module.addFunctionExport("hello", "hello");
    module.setStart(funct);
  }
}


// Optimizing
if(!process.argv.includes('-O0')){
  using time = benchmark('optimizing') 
  module.optimize();
  console.assert(module.validate());
}

// Emit
{
  using time = benchmark('writing') 

  await fs.rm('build', {recursive: true, force: true});
  await fs.mkdir('build', {recursive: true});
  module.addDebugInfoFileName('build/index.map')
  await fs.writeFile("build/index.wasm", module.emitBinary());
  await fs.writeFile("build/index.wat", module.emitText());
}

if(process.argv.includes('-o')) {
    console.log(module.emitText());
}
module.dispose();

function benchmark(name: string) {
  console.time(name)
  return {
    [Symbol.dispose]: () => {
      console.timeEnd(name)
    },
  }
}
