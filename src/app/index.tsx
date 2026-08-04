import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'delete'],
];

export default function HomeScreen() {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const generateProblem = () => {
    const n1 = Math.floor(Math.random() * 12) + 1;
    const n2 = Math.floor(Math.random() * 12) + 1;

    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setFeedback('');
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
    const parsedAnswer = parseInt(userAnswer, 10);

    if (!userAnswer || Number.isNaN(parsedAnswer)) {
      setFeedback('Answer first');
      return;
    }

    if (parsedAnswer === num1 * num2) {
      setScore((prev) => prev + 1);
      setFeedback('correct! 🎉');
      setTimeout(generateProblem, 400);
    } else {
      setUserAnswer('');
      setFeedback('try again! ❌');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>abakit</Text>
      <Text style={styles.score}>score: {score}</Text>

      <View style={styles.card}>
        <Text style={styles.problem}>{num1} × {num2}</Text>

        <View style={styles.answerBox}>
          <Text
            style={[
              styles.answerText,
              feedback ? styles.answerFeedbackText : !userAnswer ? styles.answerPlaceholderText : null,
            ]}
          >
            {feedback || userAnswer || 'Answer here'}
          </Text>
        </View>

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

        <TouchableOpacity style={styles.submitButton} onPress={checkAnswer} activeOpacity={0.85}>
          <Text style={styles.submitText}>submit</Text>
        </TouchableOpacity>
      </View>
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
  answerFeedbackText: {
    color: '#475569',
    opacity: 0.75,
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
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  feedback: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
