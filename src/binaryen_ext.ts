import binaryen from "binaryen";
// Étend l'interface existante sans toucher aux types déjà définis
interface BinaryenModule {
  _malloc(size: number): Pointer;
  _free(ptr: Pointer): void;
  __i32_store(offset: Pointer, value: number): void;
}

interface BinaryenTypeBuilder {
  _TypeBuilderCreate(size: number): TypeBuilderRef;
  _TypeBuilderGetTempHeapType(
    builder: TypeBuilderRef,
    index: number
  ): BinaryenHeapType;
  _BinaryenPackedTypeNotPacked(): number;
  _BinaryenPackedTypeInt8(): number;
  _BinaryenPackedTypeInt16(): number;
  _TypeBuilderGetSize(builder: TypeBuilderRef): number;

  _TypeBuilderSetStructType(
    builder: TypeBuilderRef,
    index: number,
    fieldTypes: number,
    fieldPackedTypes: number,
    fieldMutables: number,
    numFields: number
  ): void;

  _TypeBuilderBuildAndDispose(
    builder: TypeBuilderRef,
    heapTypes: number,
    errorIndex: number,
    errorReason: number
  ): boolean;
}

interface BinaryenStruct {
  _BinaryenStructNew(
    module: binaryen.Module,
    operands_ptr: number,
    numOperands: number,
    type: BinaryenHeapType
  ): binaryen.ExpressionRef;
  _BinaryenStructGet(
    module: binaryen.Module,
    index: number,
    ref: binaryen.ExpressionRef,
    type: binaryen.Type,
    signed: boolean
  ): binaryen.ExpressionRef;
  
  _BinaryenStructSet(
    module: binaryen.Module,
    index: number,
    ref: binaryen.ExpressionRef,
    value: binaryen.ExpressionRef): binaryen.ExpressionRef;
}

export type Pointer = { type: "Pointer" } & number;
type TypeBuilderRef = { type: "TypeBuilder" } & number;
type BinaryenHeapType = { type: "StructHeap" } & number;

// Fusionne avec le module existant
export default binaryen as typeof binaryen &
  BinaryenModule &
  BinaryenTypeBuilder &
  BinaryenStruct;
