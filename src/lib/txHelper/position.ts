import { type MoveCallInfo } from "@/types";
import { type InitPyPositionParams } from "@/types/position";
import { type TransactionObjectArgument } from "@mysten/sui/transactions";

type InitPyPositionResult<T extends boolean> = T extends true
  ? [{ pyPosition: TransactionObjectArgument; created: boolean }, MoveCallInfo]
  : { pyPosition: TransactionObjectArgument; created: boolean };

export const initPyPosition = <T extends boolean = false>({
  tx,
  config,
  pyPositions,
  returnDebugInfo,
}: InitPyPositionParams<T>): InitPyPositionResult<T> => {
  let created = false;
  let pyPosition: TransactionObjectArgument;

  if (!pyPositions?.length) {
    created = true;
    const moveCallInfo: MoveCallInfo = {
      target: `${config.nemoContractId}::py::init_py_position`,
      arguments: [
        { name: "version", value: config.version },
        { name: "py_state", value: config.pyStateId },
        { name: "clock", value: "0x6" },
      ],
      typeArguments: [config.syCoinType],
    };

    const txMoveCall = {
      target: moveCallInfo.target,
      arguments: [
        tx.object(config.version),
        tx.object(config.pyStateId),
        tx.object("0x6"),
      ],
      typeArguments: moveCallInfo.typeArguments,
    };

    pyPosition = tx.moveCall(txMoveCall);

    return (
      returnDebugInfo
        ? [{ pyPosition, created }, moveCallInfo]
        : { pyPosition, created }
    ) as InitPyPositionResult<T>;
  } else {
    if (!pyPositions[0]) {
      throw new Error("No pyPosition found in pyPositions array");
    }

    const moveCallInfo: MoveCallInfo = {
      target: `0x2::object::object`,
      arguments: [{ name: "id", value: pyPositions[0].id }],
      typeArguments: [],
    };

    pyPosition = tx.object(pyPositions[0].id);

    return (
      returnDebugInfo
        ? [{ pyPosition, created }, moveCallInfo]
        : { pyPosition, created }
    ) as InitPyPositionResult<T>;
  }
};
