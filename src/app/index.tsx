import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'delete'],
];

const operatorOptions = ['+', '-', '×', '÷'] as const;

type Operator = (typeof operatorOptions)[number];

export default function HomeScreen() {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [operator, setOperator] = useState<Operator>('×');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const operatorHighlight = useRef(new Animated.Value(0)).current;

  const generateProblem = (keepFeedback = false) => {
    let n1 = Math.floor(Math.random() * 12) + 1;
    let n2 = Math.floor(Math.random() * 12) + 1;

    if (operator === '-') {
      if (n2 > n1) [n1, n2] = [n2, n1];
    }

    if (operator === '÷') {
      const divisor = Math.floor(Math.random() * 12) + 1;
      const quotient = Math.floor(Math.random() * 12) + 1;
      n1 = divisor * quotient;
      n2 = divisor;
    }

    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    if (!keepFeedback) {
      setFeedback('');
    }
  };

  useEffect(() => {
    generateProblem();
  }, []);

  useEffect(() => {
    if (!feedback) return;

    const timer = setTimeout(() => {
      setFeedback('');
    }, 1200);

    return () => clearTimeout(timer);
  }, [feedback]);

  const displayText = feedback || userAnswer || 'answer here';
  const hasAnswer = userAnswer.length > 0;

  useEffect(() => {
    textOpacity.setValue(0);
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [displayText, textOpacity]);

  useEffect(() => {
    const currentIndex = operatorOptions.indexOf(operator);
    Animated.timing(operatorHighlight, {
      toValue: currentIndex * 76,
      duration: 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [operator, operatorHighlight]);

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 2, duration: 40, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -2, duration: 40, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: false }),
    ]).start();
  };

  const runFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        delay: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const appendDigit = (digit: string) => {
    setFeedback('');
    setUserAnswer((current) => {
      if (current.length >= 4) return current;
      return `${current}${digit}`;
    });
  };

  const deleteDigit = () => {
    setFeedback('');
    setUserAnswer((current) => current.slice(0, -1));
  };

  const clearAnswer = () => {
    setFeedback('');
    setUserAnswer('');
  };

  const checkAnswer = () => {
    if (!hasAnswer) {
      return;
    }

    const parsedAnswer = parseInt(userAnswer, 10);
    if (Number.isNaN(parsedAnswer)) {
      return;
    }

    const correct =
      operator === '+' ? num1 + num2 === parsedAnswer :
      operator === '-' ? num1 - num2 === parsedAnswer :
      operator === '×' ? num1 * num2 === parsedAnswer :
      num1 / num2 === parsedAnswer;

    if (correct) {
      setScore((prev) => prev + 1);
      setFeedback('correct!');
      generateProblem(true);
      runFlash();
    } else {
      setUserAnswer('');
      setFeedback('try again!');
      runShake();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>abakit</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsOpen(true)} activeOpacity={0.8}>
          <Text style={styles.settingsButtonText}>settings</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.score}>score: {score}</Text>

      <View style={styles.card}>
        <Text style={styles.problem}>{num1} {operator} {num2}</Text>

        <Animated.View
          style={[
            styles.answerBox,
            {
              transform: [{ translateX: shakeAnim }],
              backgroundColor: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#eef2ff', '#dcfce7'],
              }),
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.answerText,
              { opacity: textOpacity },
              feedback
                ? feedback.includes('correct')
                  ? styles.answerCorrectText
                  : styles.answerErrorText
                : !userAnswer
                ? styles.answerPlaceholderText
                : null,
            ]}
          >
            {displayText}
          </Animated.Text>
        </Animated.View>

        <View style={styles.keypad}>
          {keypadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => {
                const isFunction = key === 'clear' || key === 'delete';
                const label = key === 'delete' ? '⌫' : key === 'clear' ? 'clear' : key;

                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.keypadButton, isFunction && styles.functionKey]}
                    onPress={() => {
                      if (key === 'delete') deleteDigit();
                      else if (key === 'clear') clearAnswer();
                      else appendDigit(key);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.keypadButtonText, isFunction && styles.functionKeyText]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, !hasAnswer && styles.submitButtonDisabled]}
          onPress={checkAnswer}
          activeOpacity={hasAnswer ? 0.85 : 1}
          disabled={!hasAnswer}
        >
          <Text style={[styles.submitText, !hasAnswer && styles.submitTextDisabled]}>submit</Text>
        </TouchableOpacity>
      </View>

      {settingsOpen && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>settings</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsOpen(false)} activeOpacity={0.8}>
                <Text style={styles.closeText}>close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsLabel}>operator</Text>
            <View style={styles.operatorRow}>
              <Animated.View
                style={[
                  styles.operatorHighlight,
                  { transform: [{ translateX: operatorHighlight }] },
                ]}
              />
              {operatorOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.operatorButton, styles.operatorButtonMargin]}
                  onPress={() => {
                    setOperator(option);
                    generateProblem();
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.operatorText,
                      operator === option && styles.operatorTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  score: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 460,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  problem: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111',
    marginBottom: 22,
  },
  answerBox: {
    width: '100%',
    minHeight: 72,
    backgroundColor: '#eef2ff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 18,
  },
  answerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  answerCorrectText: {
    color: '#15803d',
    opacity: 0.85,
  },
  answerErrorText: {
    color: '#b91c1c',
    opacity: 0.9,
  },
  answerPlaceholderText: {
    color: '#64748b',
    opacity: 0.75,
  },
  keypad: {
    width: '100%',
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  keypadButton: {
    flex: 1,
    marginHorizontal: 4,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  functionKey: {
    backgroundColor: '#dbeafe',
  },
  keypadButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  functionKeyText: {
    color: '#1d4ed8',
    fontSize: 18,
  },
  submitButton: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  submitTextDisabled: {
    color: '#94a3b8',
  },
  feedback: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  operatorHighlight: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#0284c7',
    top: -2,
    left: 0,
    zIndex: 0,
  },
  operatorButton: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  operatorButtonMargin: {
    marginRight: 12,
  },
  operatorButtonSelected: {
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#0284c7',
  },
  operatorText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  operatorTextSelected: {
    color: '#0369a1',
  },
});
