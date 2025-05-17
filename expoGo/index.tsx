// app/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = Math.floor(Dimensions.get('window').width / (BOARD_WIDTH + 4));

type Point = [number, number];
const TETROMINOS: Record<string, Point[][]> = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: Array(4).fill([[1,0],[2,0],[1,1],[2,1]]),
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};
const COLORS: Record<string, string> = {
  I: '#00FFFF', O: '#FFFF00', T: '#800080',
  S: '#00FF00', Z: '#FF0000', J: '#0000FF', L: '#FFA500',
};

export default function Index() {
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
  );
  const [current, setCurrent] = useState({ shape: 'I', rotation: 0, x: Math.floor(BOARD_WIDTH/2)-2, y: 0 });

  const spawn = useCallback(() => {
    const shapes = Object.keys(TETROMINOS);
    const next = shapes[Math.floor(Math.random() * shapes.length)];
    setCurrent({ shape: next, rotation: 0, x: Math.floor(BOARD_WIDTH/2)-2, y: 0 });
  }, []);

  const valid = useCallback((x: number, y: number, r: number): boolean => {
    const shape = TETROMINOS[current.shape][r];
    for (let [dx, dy] of shape) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) return false;
      if (board[ny][nx] !== 0) return false;
    }
    return true;
  }, [board, current.shape]);

  const lock = useCallback(() => {
    setBoard(prev => {
      const b = prev.map(row => [...row]);
      for (let [dx, dy] of TETROMINOS[current.shape][current.rotation]) {
        b[current.y + dy][current.x + dx] = Object.keys(TETROMINOS).indexOf(current.shape) + 1;
      }
      // TODO: clear lines here
      return b;
    });
    spawn();
  }, [current, spawn]);

  useEffect(() => {
    const id = setInterval(() => {
      if (valid(current.x, current.y + 1, current.rotation)) {
        setCurrent(c => ({ ...c, y: c.y + 1 }));
      } else {
        lock();
      }
    }, 500);
    return () => clearInterval(id);
  }, [current, valid, lock]);

  const move = (dx: number, dr: number = 0) => {
    const nx = current.x + dx;
    const nr = (current.rotation + dr) % 4;
    if (valid(nx, current.y, nr)) setCurrent(c => ({ ...c, x: nx, rotation: nr }));
  };

  const drop = () => {
    if (valid(current.x, current.y + 1, current.rotation)) {
      setCurrent(c => ({ ...c, y: c.y + 1 }));
    } else {
      lock();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.board}>
        {board.map((row, y) => (
          <View key={y} style={styles.row}>
            {row.map((cell, x) => (
              <View key={x} style={[
                styles.cell,
                { backgroundColor: cell ? COLORS[Object.keys(TETROMINOS)[cell-1]] : '#111' }
              ]} />
            ))}
          </View>
        ))}
        {TETROMINOS[current.shape][current.rotation].map(([dx, dy], i) => (
          <View key={i} style={[
            styles.cell,
            {
              backgroundColor: COLORS[current.shape],
              position: 'absolute',
              left: (current.x + dx) * CELL_SIZE,
              top: (current.y + dy) * CELL_SIZE,
            }
          ]} />
        ))}
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => move(0, 1)}><Text style={styles.btn}>Turn</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => move(-1)}><Text style={styles.btn}>Left</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => move(1)}><Text style={styles.btn}>Right</Text></TouchableOpacity>
        <TouchableOpacity onPress={drop}><Text style={styles.btn}>Drop</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  board: { width: BOARD_WIDTH * CELL_SIZE, height: BOARD_HEIGHT * CELL_SIZE, position: 'relative' },
  row: { flexDirection: 'row' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 1, borderColor: '#222' },
  controls: { flexDirection: 'row', marginTop: 20 },
  btn: { color: '#fff', margin: 10, fontSize: 18 },
});
