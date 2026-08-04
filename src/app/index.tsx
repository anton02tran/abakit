import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  // Generate a new multiplication problem
  const generateProblem = () => {
    const n1 = Math.floor(Math.random() * 12) + 1; // 1 to 12
    const n2 = Math.floor(Math.random() * 12) + 1; // 1 to 12
    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
  };

  // Run on initial screen load
  useEffect(() => {
    generateProblem();
  }, []);

  // Check if the answer is correct
  const checkAnswer = () => {
    const parsedAnswer = parseInt(userAnswer, 10);

    if (parsedAnswer === num1 * num2) {
      setScore((prev) => prev + 1);
      setFeedback('Correct! 🎉');
      generateProblem();
    } else {
      setFeedback('Try again! ❌');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Abakit</Text>
      <Text style={styles.score}>Score: {score}</Text>

      <View style={styles.card}>
        <Text style={styles.problem}>{num1} × {num2}</Text>
        
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={userAnswer}
          onChangeText={setUserAnswer}
          placeholder="Answer"
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.button} onPress={checkAnswer}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>

        {feedback !== '' && <Text style={styles.feedback}>{feedback}</Text>}
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
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  problem: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 2,
    borderRadius: 10,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedback: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
  },
});