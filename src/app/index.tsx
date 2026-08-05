import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['skip', '0', 'delete'],
];

const formatDuration = (seconds: number) => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remSeconds}s`;
  }
  return `${seconds.toFixed(2)}s`;
};

const formatClock = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const operatorOptions = ['+', '-', '×', '÷'] as const;
const themeOptions = ['light', 'dark'] as const;

type Operator = (typeof operatorOptions)[number];
type ThemeMode = (typeof themeOptions)[number];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [operator, setOperator] = useState<Operator>('×');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [leftSize, setLeftSize] = useState<number>(1);
  const [rightSize, setRightSize] = useState<number>(1);
  const [settingsTab, setSettingsTab] = useState<'questions' | 'customize' | 'pace'>('questions');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [quickMode, setQuickMode] = useState<boolean>(false);
  const [skipMode, setSkipMode] = useState<boolean>(false);
  const [showTimer, setShowTimer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [sessionCorrect, setSessionCorrect] = useState<number>(0);
  const [sessionTotal, setSessionTotal] = useState<number>(0);
  const [sessionTimes, setSessionTimes] = useState<number[]>([]);
  const [sessionSummary, setSessionSummary] = useState<{ total: number; correct: number; avgTime: number; totalTime: number } | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState<number>(0);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const operatorScales = useRef(operatorOptions.map(() => new Animated.Value(1))).current;
  const themeScales = useRef(themeOptions.map(() => new Animated.Value(1))).current;
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRunId = useRef(0);
  const [flashType, setFlashType] = useState<'correct' | 'skip'>('correct');
  const questionStartRef = useRef<number>(Date.now());
  const questionResolvedRef = useRef<boolean>(false);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionCounterScale = useRef(new Animated.Value(1)).current;

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
    questionStartRef.current = Date.now();
    questionResolvedRef.current = false;
  };

  useEffect(() => {
    generateProblem();
  }, []);

  useEffect(() => {
    // regenerate when digit sizes change
    generateProblem();
  }, [leftSize, rightSize]);

  useEffect(() => {
    if (!sessionActive || !showTimer) return;

    setSessionElapsed(Date.now() - sessionStartRef.current);
    const interval = setInterval(() => {
      setSessionElapsed(Date.now() - sessionStartRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, showTimer]);

  useEffect(() => {
    if (!feedback) return;

    const timer = setTimeout(() => {
      setFeedback('');
    }, 1200);

    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!lastResult) return;

    const timer = setTimeout(() => {
      setLastResult(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [lastResult]);

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

  const runFlash = (type: 'correct' | 'skip' = 'correct') => {
    flashRunId.current += 1;
    const currentRun = flashRunId.current;
    setFlashType(type);
    flashAnim.stopAnimation();
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
    ]).start(() => {
      if (flashRunId.current === currentRun) {
        setFlashType('correct');
      }
    });
  };

  const computeAnswer = () =>
    operator === '+' ? num1 + num2 :
    operator === '-' ? num1 - num2 :
    operator === '×' ? num1 * num2 :
    num1 / num2;

  const resolveQuestion = (isCorrect: boolean) => {
    if (!sessionActive || questionResolvedRef.current) return;
    questionResolvedRef.current = true;
    const elapsed = Date.now() - questionStartRef.current;
    setSessionTimes((prev) => [...prev, elapsed]);
    setSessionTotal((prev) => prev + 1);
    if (isCorrect) {
      setSessionCorrect((prev) => prev + 1);
    }
    setLastResult(isCorrect ? 'correct' : 'wrong');
    sessionCounterScale.setValue(1);
    Animated.sequence([
      Animated.timing(sessionCounterScale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
      Animated.spring(sessionCounterScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  };

  const startSession = () => {
    setSessionActive(true);
    setSessionCorrect(0);
    setSessionTotal(0);
    setSessionTimes([]);
    setSessionSummary(null);
    setLastResult(null);
    setSessionElapsed(0);
    questionStartRef.current = Date.now();
    questionResolvedRef.current = false;
    sessionStartRef.current = Date.now();
  };

  const endSession = () => {
    setSessionActive(false);
    const total = sessionTimes.length;
    const totalTime = sessionTimes.reduce((sum, t) => sum + t, 0) / 1000;
    const avgTime = total > 0 ? totalTime / total : 0;
    setSessionSummary({ total: sessionTotal, correct: sessionCorrect, avgTime, totalTime });
  };

  const submitAnswer = (rawAnswer: string) => {
    if (!rawAnswer) {
      return;
    }

    const parsedAnswer = parseInt(rawAnswer, 10);
    if (Number.isNaN(parsedAnswer)) {
      return;
    }

    const answer = computeAnswer();
    const correct = answer === parsedAnswer;

    if (correct) {
      setScore((prev) => prev + 1);
      setFeedback('correct!');
      resolveQuestion(true);
      generateProblem(true);
      runFlash();
    } else if (skipMode) {
      setFeedback(String(answer));
      setUserAnswer('');
      resolveQuestion(false);
      runFlash('skip');
      generateProblem(true);

      if (skipTimer.current) {
        clearTimeout(skipTimer.current);
      }
      skipTimer.current = setTimeout(() => {
        skipTimer.current = null;
        setFeedback('');
      }, 900);
    } else {
      setUserAnswer('');
      setFeedback('try again!');
      resolveQuestion(false);
      runShake();
    }
  };

  const appendDigit = (digit: string) => {
    if (userAnswer.length >= 7) return;

    setFeedback('');
    const next = `${userAnswer}${digit}`;
    setUserAnswer(next);

    if (quickMode) {
      const answerDigits = String(computeAnswer()).length;
      if (next.length >= answerDigits) {
        submitAnswer(next);
      }
    }
  };

  const deleteDigit = () => {
    setFeedback('');
    setUserAnswer((current) => current.slice(0, -1));
  };

  const skipQuestion = () => {
    const answer = computeAnswer();

    setFeedback(String(answer));
    setUserAnswer('');
    resolveQuestion(false);
    runFlash('skip');
    generateProblem(true);

    if (skipTimer.current) {
      clearTimeout(skipTimer.current);
    }
    skipTimer.current = setTimeout(() => {
      skipTimer.current = null;
      setFeedback('');
    }, 900);
  };

  const checkAnswer = () => {
    if (!hasAnswer) {
      return;
    }
    submitAnswer(userAnswer);
  };

  return (
    <View
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        {
          paddingTop: 24 + insets.top,
          paddingBottom: 24 + insets.bottom,
          paddingLeft: 24 + insets.left,
          paddingRight: 24 + insets.right,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>abakit</Text>
        <TouchableOpacity style={[styles.settingsButton, isDarkMode && styles.settingsButtonDark]} onPress={() => setSettingsOpen(true)} activeOpacity={0.8}>
          <Text style={[styles.settingsButtonText, isDarkMode && styles.settingsButtonTextDark]}>settings</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.score, isDarkMode && styles.scoreDark]}>score: {score}</Text>

      <View style={styles.sessionRow}>
        {sessionActive ? (
          <>
            {showTimer && (
              <View style={[styles.timerBadge, isDarkMode && styles.timerBadgeDark]}>
                <Text style={[styles.timerText, isDarkMode && styles.timerTextDark]}>{formatClock(sessionElapsed)}</Text>
              </View>
            )}
            <Animated.Text
              style={[
                styles.sessionCounter,
                isDarkMode && styles.sessionCounterDark,
                lastResult === 'correct' && (isDarkMode ? styles.sessionCounterCorrectDark : styles.sessionCounterCorrect),
                lastResult === 'wrong' && (isDarkMode ? styles.sessionCounterWrongDark : styles.sessionCounterWrong),
                { transform: [{ scale: sessionCounterScale }] },
              ]}
            >
              {sessionCorrect}/{sessionTotal}
            </Animated.Text>
            <TouchableOpacity
              style={[styles.sessionButton, styles.sessionButtonEnd, isDarkMode && styles.sessionButtonEndDark]}
              onPress={endSession}
              activeOpacity={0.85}
            >
              <Text style={styles.sessionButtonText}>end session</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.sessionButton, styles.sessionButtonStart, isDarkMode && styles.sessionButtonStartDark]}
            onPress={startSession}
            activeOpacity={0.85}
          >
            <Text style={styles.sessionButtonText}>start session</Text>
          </TouchableOpacity>
        )}
      </View>

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
                outputRange: flashType === 'skip'
                  ? isDarkMode
                    ? ['#7f1d1d', '#991b1b']
                    : ['#fecaca', '#fca5a5']
                  : isDarkMode
                    ? ['#111827', '#1d2939']
                    : ['#eef2ff', '#dcfce7'],
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
                const isFunction = key === 'skip' || key === 'delete';
                const label = key === 'delete' ? '⌫' : key === 'skip' ? 'skip' : key;

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
                      else if (key === 'skip') skipQuestion();
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
                  settingsTab === 'customize' && (isDarkMode ? styles.tabButtonSelectedDark : styles.tabButtonSelected),
                  isDarkMode && styles.tabButtonDark,
                ]}
                onPress={() => setSettingsTab('customize')}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.tabText,
                  isDarkMode ? styles.tabTextDark : null,
                  settingsTab === 'customize' && (isDarkMode ? styles.tabTextSelectedDark : styles.tabTextSelected),
                ]}>customize</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  settingsTab === 'pace' && (isDarkMode ? styles.tabButtonSelectedDark : styles.tabButtonSelected),
                  isDarkMode && styles.tabButtonDark,
                ]}
                onPress={() => setSettingsTab('pace')}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.tabText,
                  isDarkMode ? styles.tabTextDark : null,
                  settingsTab === 'pace' && (isDarkMode ? styles.tabTextSelectedDark : styles.tabTextSelected),
                ]}>pace</Text>
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
            ) : settingsTab === 'pace' ? (
              <>
                <View style={styles.toggleSection}>
                  <View>
                    <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>quick mode</Text>
                    <Text style={[styles.toggleDescription, isDarkMode && styles.toggleDescriptionDark]}>
                      Auto-submits as soon as your answer reaches the correct number of digits.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      quickMode ? styles.toggleSwitchOn : styles.toggleSwitchOff,
                      isDarkMode && (quickMode ? styles.toggleSwitchOnDark : styles.toggleSwitchOffDark),
                    ]}
                    onPress={() => setQuickMode((current) => !current)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, quickMode && styles.toggleThumbOn, isDarkMode && styles.toggleThumbDark]} />
                  </TouchableOpacity>
                </View>
                <View style={styles.toggleSection}>
                  <View>
                    <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>skip mode</Text>
                    <Text style={[styles.toggleDescription, isDarkMode && styles.toggleDescriptionDark]}>
                      Wrong answers reveal the solution and immediately advance to the next problem.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      skipMode ? styles.toggleSwitchOn : styles.toggleSwitchOff,
                      isDarkMode && (skipMode ? styles.toggleSwitchOnDark : styles.toggleSwitchOffDark),
                    ]}
                    onPress={() => setSkipMode((current) => !current)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, skipMode && styles.toggleThumbOn, isDarkMode && styles.toggleThumbDark]} />
                  </TouchableOpacity>
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
                <View style={styles.toggleSection}>
                  <View>
                    <Text style={[styles.settingsLabel, isDarkMode && styles.settingsLabelDark]}>show timer</Text>
                    <Text style={[styles.toggleDescription, isDarkMode && styles.toggleDescriptionDark]}>
                      Displays a live running timer while a session is active.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      showTimer ? styles.toggleSwitchOn : styles.toggleSwitchOff,
                      isDarkMode && (showTimer ? styles.toggleSwitchOnDark : styles.toggleSwitchOffDark),
                    ]}
                    onPress={() => setShowTimer((current) => !current)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, showTimer && styles.toggleThumbOn, isDarkMode && styles.toggleThumbDark]} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {sessionSummary && (
        <View style={styles.settingsOverlay}>
          <View style={[styles.settingsCard, styles.summaryCard, isDarkMode && styles.settingsCardDark]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, isDarkMode && styles.settingsTitleDark]}>session summary</Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  styles.closeButtonBorder,
                  isDarkMode && styles.closeButtonBorderDark,
                ]}
                onPress={() => setSessionSummary(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeText, isDarkMode && styles.closeTextDark]}>close</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.summaryRow, isDarkMode && styles.summaryRowDark]}>
              <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>questions</Text>
              <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>{sessionSummary.total}</Text>
            </View>
            <View style={[styles.summaryRow, isDarkMode && styles.summaryRowDark]}>
              <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>correct</Text>
              <Text style={[styles.summaryValue, isDarkMode ? styles.summaryValueCorrectDark : styles.summaryValueCorrect]}>
                {sessionSummary.correct}/{sessionSummary.total}
                {sessionSummary.total > 0 ? ` (${Math.round((sessionSummary.correct / sessionSummary.total) * 100)}%)` : ''}
              </Text>
            </View>
            <View style={[styles.summaryRow, isDarkMode && styles.summaryRowDark]}>
              <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>total time</Text>
              <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
                {sessionSummary.total > 0 ? formatDuration(sessionSummary.totalTime) : '—'}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>avg time / question</Text>
              <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
                {sessionSummary.total > 0 ? `${sessionSummary.avgTime.toFixed(2)}s` : '—'}
              </Text>
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
    marginBottom: 16,
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
    padding: 24,
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
  toggleSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    padding: 4,
  },
  toggleSwitchOn: {
    backgroundColor: '#10b981',
  },
  toggleSwitchOff: {
    backgroundColor: '#cbd5e1',
  },
  toggleSwitchOnDark: {
    backgroundColor: '#22c55e',
  },
  toggleSwitchOffDark: {
    backgroundColor: '#334155',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleThumbDark: {
    backgroundColor: '#e2e8f0',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    maxWidth: 220,
  },
  toggleDescriptionDark: {
    color: '#94a3b8',
  },
  answerTextDark: {
    color: '#f8fafc',
  },
  titleDark: {
    color: '#f8fafc',
  },
  sessionRow: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sessionButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionButtonStart: {
    backgroundColor: '#2563eb',
  },
  sessionButtonStartDark: {
    backgroundColor: '#3b82f6',
  },
  sessionButtonEnd: {
    backgroundColor: '#ef4444',
  },
  sessionButtonEndDark: {
    backgroundColor: '#dc2626',
  },
  sessionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sessionCounter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#475569',
    marginRight: 14,
  },
  sessionCounterDark: {
    color: '#cbd5e1',
  },
  sessionCounterCorrect: {
    color: '#16a34a',
  },
  sessionCounterCorrectDark: {
    color: '#4ade80',
  },
  sessionCounterWrong: {
    color: '#dc2626',
  },
  sessionCounterWrongDark: {
    color: '#f87171',
  },
  timerBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  timerBadgeDark: {
    backgroundColor: '#334155',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  timerTextDark: {
    color: '#f8fafc',
  },
  summaryCard: {
    maxWidth: 360,
  },
  summaryRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryRowDark: {
    borderBottomColor: '#334155',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  summaryLabelDark: {
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryValueDark: {
    color: '#f8fafc',
  },
  summaryValueCorrect: {
    color: '#16a34a',
  },
  summaryValueCorrectDark: {
    color: '#4ade80',
  },
});
