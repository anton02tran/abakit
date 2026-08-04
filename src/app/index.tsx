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
  const [leftSize, setLeftSize] = useState<number>(1);
  const [rightSize, setRightSize] = useState<number>(1);
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
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const minForDigits = (d: number) => (d === 1 ? 1 : Math.pow(10, d - 1));
    const maxForDigits = (d: number) => Math.pow(10, d) - 1;

    const min1 = minForDigits(leftSize);
    const max1 = maxForDigits(leftSize);
    const min2 = minForDigits(rightSize);
    const max2 = maxForDigits(rightSize);

    let n1 = randInt(min1, max1);
    let n2 = randInt(min2, max2);

    if (operator === '-') {
      // ensure non-negative result by swapping when needed
      if (n2 > n1) [n1, n2] = [n2, n1];
    }

    if (operator === '÷') {
      // Try to create a dividend n1 with leftSize digits that's divisible by n2 (rightSize digits)
      let attempts = 0;
      let found = false;
      while (attempts < 40 && !found) {
        n2 = randInt(min2, max2);
        const minQ = Math.ceil(min1 / n2);
        const maxQ = Math.floor(max1 / n2);
        if (maxQ >= Math.max(1, minQ)) {
          const q = randInt(Math.max(1, minQ), maxQ);
          n1 = n2 * q;
          found = true;
          break;
        }
        attempts += 1;
      }
      if (!found) {
        // fallback: pick divisor 1 and random dividend in range
        n2 = 1;
        n1 = randInt(min1, max1);
      }
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
    // regenerate when digit sizes change
    generateProblem();
  }, [leftSize, rightSize]);

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
      if (current.length >= 7) return current;
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
        <TouchableOpacity style={[styles.settingsButton, isDarkMode && styles.settingsButtonDark]} onPress={() => setSettingsOpen(true)} activeOpacity={0.8}>
          <Text style={[styles.settingsButtonText, isDarkMode && styles.settingsButtonTextDark]}>settings</Text>
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
          style={[styles.submitButton, styles.submitButtonRaised, isDarkMode && styles.submitButtonDark, !hasAnswer && styles.submitButtonDisabled]}
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
                style={[
                  styles.tabButton,
                  settingsTab === 'questions' && (isDarkMode ? styles.tabButtonSelectedDark : styles.tabButtonSelected),
                  isDarkMode && styles.tabButtonDark,
                ]}
                onPress={() => setSettingsTab('questions')}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.tabText,
                  isDarkMode ? styles.tabTextDark : null,
                  settingsTab === 'questions' && (isDarkMode ? styles.tabTextSelectedDark : styles.tabTextSelected),
                ]}>questions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  settingsTab === 'personalization' && (isDarkMode ? styles.tabButtonSelectedDark : styles.tabButtonSelected),
                  isDarkMode && styles.tabButtonDark,
                ]}
                onPress={() => setSettingsTab('personalization')}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.tabText,
                  isDarkMode ? styles.tabTextDark : null,
                  settingsTab === 'personalization' && (isDarkMode ? styles.tabTextSelectedDark : styles.tabTextSelected),
                ]}>personalization</Text>
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
                        isDarkMode && styles.operatorButtonDark,
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
                          isDarkMode && styles.operatorTextDark,
                          operator === option && (isDarkMode ? styles.operatorTextSelectedDark : styles.operatorTextSelected),
                        ]}
                      >
                        {option}
                      </Text>
                    </AnimatedTouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>number size</Text>
                <View style={styles.sizeRow}>
                  <View style={[styles.sizeBox, isDarkMode && styles.sizeBoxDark]}>
                    <TouchableOpacity
                      style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                      onPress={() => setLeftSize((s) => Math.min(3, s + 1))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.arrowText, isDarkMode && styles.arrowTextDark]}>▲</Text>
                    </TouchableOpacity>
                    <Text style={[styles.sizeText, isDarkMode && styles.sizeTextDark]}>{leftSize}</Text>
                    <TouchableOpacity
                      style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                      onPress={() => setLeftSize((s) => Math.max(1, s - 1))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.arrowText, isDarkMode && styles.arrowTextDark]}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.sizeBox, isDarkMode && styles.sizeBoxDark]}>
                    <TouchableOpacity
                      style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                      onPress={() => setRightSize((s) => Math.min(3, s + 1))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.arrowText, isDarkMode && styles.arrowTextDark]}>▲</Text>
                    </TouchableOpacity>
                    <Text style={[styles.sizeText, isDarkMode && styles.sizeTextDark]}>{rightSize}</Text>
                    <TouchableOpacity
                      style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                      onPress={() => setRightSize((s) => Math.max(1, s - 1))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.arrowText, isDarkMode && styles.arrowTextDark]}>▼</Text>
                    </TouchableOpacity>
                  </View>
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
                        isDarkMode && styles.operatorButtonDark,
                        theme === option && (isDarkMode ? styles.operatorButtonSelectedDark : styles.operatorButtonSelected),
                        { transform: [{ scale: themeScales[index] }] },
                      ]}
                      onPress={() => setTheme(option)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.operatorText,
                          isDarkMode && styles.operatorTextDark,
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
  submitButtonRaised: {
    marginTop: -8,
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
  settingsButtonDark: {
    backgroundColor: '#334155',
  },
  settingsButtonTextDark: {
    color: '#f8fafc',
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
  operatorButtonDark: {
    backgroundColor: '#0b1220',
    borderColor: '#334155',
  },
  operatorText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
  },
  operatorTextDark: {
    color: '#cbd5e1',
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
  sizeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sizeBox: {
    flex: 1,
    minWidth: 110,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
  },
  sizeBoxDark: {
    backgroundColor: '#0f1724',
    borderColor: '#334155',
  },
  arrowButton: {
    padding: 8,
    marginHorizontal: 6,
  },
  arrowButtonDark: {
    padding: 8,
    marginHorizontal: 6,
  },
  arrowText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '800',
  },
  arrowTextDark: {
    color: '#f8fafc',
  },
  sizeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f1724',
  },
  sizeTextDark: {
    color: '#f8fafc',
  },
  answerTextDark: {
    color: '#f8fafc',
  },
  titleDark: {
    color: '#f8fafc',
  },
});
