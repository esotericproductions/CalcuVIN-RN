import React, { useMemo, useReducer } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

type Op = "+" | "−" | "×" | "÷";
type Key =
  | "C"
  | "±"
  | "%"
  | "÷"
  | "7"
  | "8"
  | "9"
  | "×"
  | "4"
  | "5"
  | "6"
  | "−"
  | "1"
  | "2"
  | "3"
  | "+"
  | "0"
  | "."
  | "=";

type State = {
  display: string; // what you see
  acc: number | null; // accumulator (previous value)
  op: Op | null; // pending operation
  entering: boolean; // are we typing a new number?
  justEvaluated: boolean; // last key was '='
};

type Action =
  | { type: "DIGIT"; digit: string }
  | { type: "DOT" }
  | { type: "CLEAR" }
  | { type: "TOGGLE_SIGN" }
  | { type: "PERCENT" }
  | { type: "OP"; op: Op }
  | { type: "EQUALS" };

const initialState: State = {
  display: "0",
  acc: null,
  op: null,
  entering: true,
  justEvaluated: false,
};

function toNumber(display: string): number {
  const n = Number(display);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  // Avoid showing "-0"
  if (Object.is(n, -0)) n = 0;
  // Trim long float tails a bit
  const s = String(n);
  if (s.includes("e")) return s;
  if (s.includes(".")) {
    // limit to ~10 decimals then trim
    const fixed = n.toFixed(10).replace(/\.?0+$/, "");
    return fixed;
  }
  return s;
}

function applyOp(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function reducer(state: State, action: Action): State {
  const cur = toNumber(state.display);

  switch (action.type) {
    case "CLEAR":
      return { ...initialState };

    case "DIGIT": {
      // If we just evaluated, starting digits begins a new entry
      const startFresh =
        state.justEvaluated && state.op === null && state.acc === null;
      if (!state.entering || startFresh) {
        return {
          ...state,
          display: action.digit,
          entering: true,
          justEvaluated: false,
        };
      }
      // entering current number
      if (state.display === "0") {
        return { ...state, display: action.digit, justEvaluated: false };
      }
      return {
        ...state,
        display: state.display + action.digit,
        justEvaluated: false,
      };
    }

    case "DOT": {
      const startFresh =
        state.justEvaluated && state.op === null && state.acc === null;
      if (!state.entering || startFresh) {
        return {
          ...state,
          display: "0.",
          entering: true,
          justEvaluated: false,
        };
      }
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + ".", justEvaluated: false };
    }

    case "TOGGLE_SIGN": {
      if (state.display === "0") return state;
      const n = -cur;
      return { ...state, display: formatNumber(n), justEvaluated: false };
    }

    case "PERCENT": {
      // Common mobile behavior: percent turns current entry into /100.
      const n = cur / 100;
      return { ...state, display: formatNumber(n), justEvaluated: false };
    }

    case "OP": {
      // If we have a pending op and we were entering, apply it now (immediate-execution)
      if (state.op && state.acc !== null && state.entering) {
        const nextAcc = applyOp(state.acc, cur, state.op);
        return {
          display: formatNumber(nextAcc),
          acc: nextAcc,
          op: action.op,
          entering: false,
          justEvaluated: false,
        };
      }

      // No pending op yet: move current into accumulator
      const nextAcc = state.acc ?? cur;
      return {
        ...state,
        acc: nextAcc,
        op: action.op,
        entering: false,
        justEvaluated: false,
      };
    }

    case "EQUALS": {
      if (!state.op || state.acc === null) {
        return { ...state, justEvaluated: true, entering: false };
      }

      const result = applyOp(state.acc, cur, state.op);
      return {
        display: formatNumber(result),
        acc: null,
        op: null,
        entering: false,
        justEvaluated: true,
      };
    }
  }
}

export default function CalculatorScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const keys: Key[][] = useMemo(
    () => [
      ["C", "±", "%", "÷"],
      ["7", "8", "9", "×"],
      ["4", "5", "6", "−"],
      ["1", "2", "3", "+"],
      ["0", ".", "="],
    ],
    [],
  );

  function onKeyPress(k: Key) {
    if (k === "C") return dispatch({ type: "CLEAR" });
    if (k === "±") return dispatch({ type: "TOGGLE_SIGN" });
    if (k === "%") return dispatch({ type: "PERCENT" });
    if (k === ".") return dispatch({ type: "DOT" });
    if (k === "=") return dispatch({ type: "EQUALS" });

    if (k === "+" || k === "−" || k === "×" || k === "÷") {
      return dispatch({ type: "OP", op: k });
    }

    // digits
    return dispatch({ type: "DIGIT", digit: k });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.display}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.displayText}
          >
            {state.display}
          </Text>
        </View>

        <View style={styles.pad}>
          {keys.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((k) => (
                <CalcKey
                  key={k}
                  label={k}
                  onPress={() => onKeyPress(k)}
                  wide={k === "0"}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function CalcKey({
  label,
  onPress,
  wide,
}: {
  label: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        wide && styles.keyWide,
        pressed && styles.keyPressed,
      ]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 12, gap: 12 },

  display: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  displayText: { color: "white", fontSize: 64, fontWeight: "600" },

  pad: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },

  key: {
    flex: 1,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  keyWide: { flex: 2.07 },
  keyPressed: { opacity: 0.6 },
  keyText: { color: "white", fontSize: 26, fontWeight: "600" },
});
