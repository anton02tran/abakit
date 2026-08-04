import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'delete'],
];

const operatorOptions = ['+', '-', '×', '÷'] as const;
const themeOptions = ['light', 'dark'] as const;

type Operator = (typeof operatorOptions)[number];
type ThemeMode = (typeof themeOptions)[number];

export default function HomeScreen() {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [operator, setOperator] = useState<Operator>('×');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [settingsTab, setSettingsTab] = useState<'questions' | 'personalization'>('questions');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const operatorScales = useRef(operatorOptions.map(() => new Animated.Value(1))).current;
  const themeScales = useRef(themeOptions.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.parallel(
      operatorScales.map((scale, index) =>
        Animated.spring(scale, {
          toValue: operatorOptions[index] === operator ? 1.08 : 1,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [operator, operatorScales]);

  useEffect(() => {
    Animated.parallel(
      themeScales.map((scale, index) =>
        Animated.spring(scale, {
          toValue: themeOptions[index] === theme ? 1.06 : 1,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [theme, themeScales]);

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
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    textOpacity.setValue(0);
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [displayText, textOpacity]);

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
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>abakit</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsOpen(true)} activeOpacity={0.8}>
          <Text style={styles.settingsButtonText}>settings</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.score, isDarkMode && styles.scoreDark]}>score: {score}</Text>

      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.problem, isDarkMode && styles.problemDark]}>{num1} {operator} {num2}</Text>

        <Animated.View
          style={[
            styles.answerBox,
            isDarkMode && styles.answerBoxDark,
            {
              transform: [{ translateX: shakeAnim }],
              backgroundColor: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: isDarkMode ? ['#111827', '#1d2939'] : ['#eef2ff', '#dcfce7'],
              }),
            },
          ]}
        >
          <Animated.Text
              style={[
                styles.answerText,
                isDarkMode && styles.answerTextDark,
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
                      style={[
                        styles.keypadButton,
                        isDarkMode && styles.keypadButtonDark,
                        isFunction && styles.functionKey,
                        isDarkMode && isFunction && styles.functionKeyDark,
                      ]}
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
          style={[styles.submitButton, isDarkMode && styles.submitButtonDark, !hasAnswer && styles.submitButtonDisabled]}
          onPress={checkAnswer}
          activeOpacity={hasAnswer ? 0.85 : 1}
          disabled={!hasAnswer}
        >
          <Text style={[styles.submitText, isDarkMode && styles.submitTextDark, !hasAnswer && styles.submitTextDisabled]}>submit</Text>
        </TouchableOpacity>
      </View>

      {settingsOpen && (
        <View style={styles.settingsOverlay}>
          <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, isDarkMode && styles.settingsTitleDark]}>settings</Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  styles.closeButtonBorder,
                  isDarkMode && styles.closeButtonBorderDark,
                ]}
                onPress={() => setSettingsOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeText, isDarkMode && styles.closeTextDark]}>close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, settingsTab === 'questions' && styles.tabButtonSelected]}
                onPress={() => setSettingsTab('questions')}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, settingsTab === 'questions' && styles.tabTextSelected]}>questions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, settingsTab === 'personalization' && styles.tabButtonSelected]}
                onPress={() => setSettingsTab('personalization')}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, settingsTab === 'personalization' && styles.tabTextSelected]}>personalization</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.tabDivider, isDarkMode && styles.tabDividerDark]} />

            {settingsTab === 'questions' ? (
              <>
                <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>operator</Text>
                <View style={styles.operatorRow}>
                  {operatorOptions.map((option, index) => (
                    <AnimatedTouchableOpacity
                      key={option}
                      style={[
                        styles.operatorButton,
                        operator === option && (isDarkMode ? styles.operatorButtonSelectedDark : styles.operatorButtonSelected),
                        { transform: [{ scale: operatorScales[index] }] },
                      ]}
                      onPress={() => {
                        setOperator(option);
                        generateProblem();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.operatorText,
                          operator === option && (isDarkMode ? styles.operatorTextSelectedDark : styles.operatorTextSelected),
                        ]}
                      >
                        {option}
                      </Text>
                    </AnimatedTouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>display</Text>
                <View style={styles.operatorRow}>
                  {themeOptions.map((option, index) => (
                    <AnimatedTouchableOpacity
                      key={option}
                      style={[
                        styles.operatorButton,
                        theme === option && (isDarkMode ? styles.operatorButtonSelectedDark : styles.operatorButtonSelected),
                        { transform: [{ scale: themeScales[index] }] },
                      ]}
                      onPress={() => setTheme(option)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.operatorText,
                          theme === option && (isDarkMode ? styles.operatorTextSelectedDark : styles.operatorTextSelected),
                        ]}
                      >
                        {option}
                      </Text>
                    </AnimatedTouchableOpacity>
                  ))}
                </View>
              </>
            )}
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
    color: '#4ade80',
    opacity: 0.95,
  },
  answerErrorText: {
    color: '#f87171',
    opacity: 0.95,
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
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    textTransform: 'none',
    letterSpacing: 1,
  },
  operatorRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  operatorButton: {
    flex: 1,
    minWidth: 64,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  operatorButtonSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  operatorButtonSelectedDark: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  operatorText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
  },
  operatorTextSelected: {
    color: '#0369a1',
  },
  operatorTextSelectedDark: {
    color: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  tabButtonSelected: {
    backgroundColor: '#e6f2ff',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'none',
  },
  tabTextSelected: {
    color: '#0369a1',
  },
  tabTextDark: {
    color: '#cbd5e1',
  },
  tabTextSelectedDark: {
    color: '#38bdf8',
  },
  tabButtonDark: {
    backgroundColor: 'transparent',
  },
  tabButtonSelectedDark: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#eef2ff',
    marginVertical: 12,
    borderRadius: 1,
  },
  tabDividerDark: {
    height: 1,
    backgroundColor: '#0b1220',
    marginVertical: 12,
    borderRadius: 1,
  },
  closeButtonBorder: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  closeButtonBorderDark: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  keypadButtonDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  keypadButtonTextDark: {
    color: '#f8fafc',
  },
  functionKeyDark: {
    backgroundColor: '#1e3a8a',
  },
  functionKeyTextDark: {
    color: '#f8fafc',
  },
  submitButtonDark: {
    backgroundColor: '#3b82f6',
  },
  submitTextDark: {
    color: '#f8fafc',
  },
  themeLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#475569',
    textTransform: 'none',
  },
  themeLabelDark: {
    color: '#cbd5e1',
  },
  containerDark: {
    backgroundColor: '#090d16',
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  scoreDark: {
    color: '#f8fafc',
  },
  problemDark: {
    color: '#f8fafc',
  },
  answerBoxDark: {
    backgroundColor: '#1e1b4b',
    borderColor: '#4338ca',
  },
  settingsTitleDark: {
    color: '#f8fafc',
  },
  settingsLabelDark: {
    color: '#94a3b8',
  },
  settingsCardDark: {
    backgroundColor: '#1e293b',
  },
  closeTextDark: {
    color: '#f8fafc',
  },
  answerTextDark: {
    color: '#f8fafc',
  },
  titleDark: {
    color: '#f8fafc',
  },
});
