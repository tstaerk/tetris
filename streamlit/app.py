import streamlit as st
import random

# Spielfeldgröße
BOARD_WIDTH = 10
BOARD_HEIGHT = 20

# Tetrimino-Definitionen (Rotationen)
TETROMINOS = {
    'I': [
        [(0,1),(1,1),(2,1),(3,1)],
        [(2,0),(2,1),(2,2),(2,3)],
        [(0,2),(1,2),(2,2),(3,2)],
        [(1,0),(1,1),(1,2),(1,3)]
    ],
    'O': [[(1,0),(2,0),(1,1),(2,1)]] * 4,
    'T': [
        [(1,0),(0,1),(1,1),(2,1)],
        [(1,0),(1,1),(2,1),(1,2)],
        [(0,1),(1,1),(2,1),(1,2)],
        [(1,0),(0,1),(1,1),(1,2)]
    ],
    'S': [
        [(1,0),(2,0),(0,1),(1,1)],
        [(1,0),(1,1),(2,1),(2,2)],
        [(1,1),(2,1),(0,2),(1,2)],
        [(0,0),(0,1),(1,1),(1,2)]
    ],
    'Z': [
        [(0,0),(1,0),(1,1),(2,1)],
        [(2,0),(1,1),(2,1),(1,2)],
        [(0,1),(1,1),(1,2),(2,2)],
        [(1,0),(0,1),(1,1),(0,2)]
    ],
    'J': [
        [(0,0),(0,1),(1,1),(2,1)],
        [(1,0),(2,0),(1,1),(1,2)],
        [(0,1),(1,1),(2,1),(2,2)],
        [(1,0),(1,1),(0,2),(1,2)]
    ],
    'L': [
        [(2,0),(0,1),(1,1),(2,1)],
        [(1,0),(1,1),(1,2),(2,2)],
        [(0,1),(1,1),(2,1),(0,2)],
        [(0,0),(1,0),(1,1),(1,2)]
    ]
}

# Farben für Tetriminos
COLORS = {
    'I': '#00FFFF', 'O': '#FFFF00', 'T': '#800080',
    'S': '#00FF00', 'Z': '#FF0000', 'J': '#0000FF', 'L': '#FFA500'
}

# Render-Funktion für Spielfeld
def render(board, cell_size=20):
    html = '<div style="display:inline-block;line-height:0">'
    for row in board:
        for cell in row:
            color = COLORS[cell] if cell else '#111'
            html += f"<div style='width:{cell_size}px;height:{cell_size}px;display:inline-block;background-color:{color};margin:1px;'></div>"
        html += '<br>'
    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

# Render-Funktion für nächsten Stein (Rotation 0)
def render_next(piece, cell_size=20):
    shape = TETROMINOS[piece][0]
    html = '<div style="display:inline-block;line-height:0">'
    for y in range(4):
        for x in range(4):
            color = '#111'
            if (x, y) in shape:
                color = COLORS[piece]
            html += f"<div style='width:{cell_size}px;height:{cell_size}px;display:inline-block;background-color:{color};margin:1px;'></div>"
        html += '<br>'
    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

# Initialisierung des Spiels
def init():
    st.session_state.board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
    st.session_state.credits = 0
    st.session_state.pause_ticks = 0
    st.session_state.score = 0
    st.session_state.next_piece = random.choice(list(TETROMINOS.keys()))
    new_piece()

# Neuen Stein laden
def new_piece():
    st.session_state.current_piece = st.session_state.next_piece
    st.session_state.next_piece = random.choice(list(TETROMINOS.keys()))
    st.session_state.rotation = 0
    st.session_state.x = BOARD_WIDTH // 2 - 2
    st.session_state.y = 0

# Prüfen, ob Position gültig ist
def valid_position(x, y, rotation):
    for dx, dy in TETROMINOS[st.session_state.current_piece][rotation]:
        nx, ny = x + dx, y + dy
        if nx < 0 or nx >= BOARD_WIDTH or ny < 0 or ny >= BOARD_HEIGHT:
            return False
        if st.session_state.board[ny][nx]:
            return False
    return True

# Stein fixieren
def lock_piece():
    for dx, dy in TETROMINOS[st.session_state.current_piece][st.session_state.rotation]:
        st.session_state.board[st.session_state.y + dy][st.session_state.x + dx] = st.session_state.current_piece
    clear_lines()
    new_piece()
    if not valid_position(st.session_state.x, st.session_state.y, st.session_state.rotation):
        st.warning("Game Over!")
        init()

# Löschen kompletter Linien und Punkte/Credits vergeben
def clear_lines():
    new_board = [row for row in st.session_state.board if any(cell == 0 for cell in row)]
    lines = BOARD_HEIGHT - len(new_board)
    if lines:
        st.session_state.score += lines * 100
        st.session_state.credits += lines
    for _ in range(lines):
        new_board.insert(0, [0] * BOARD_WIDTH)
    st.session_state.board = new_board

# Automatisches Fallen ohne Credits (für Timer)
def fall():
    if valid_position(st.session_state.x, st.session_state.y + 1, st.session_state.rotation):
        st.session_state.y += 1
    else:
        lock_piece()

# Bewegung und Rotation
def move(dx, dr):
    nx = st.session_state.x + dx
    nr = (st.session_state.rotation + dr) % 4
    if valid_position(nx, st.session_state.y, nr):
        st.session_state.x, st.session_state.rotation = nx, nr

# Drop-Funktion mit Punkte/Credit

def drop():
    if valid_position(st.session_state.x, st.session_state.y + 1, st.session_state.rotation):
        st.session_state.y += 1
        st.session_state.score += 1
    else:
        lock_piece()

def droptyped():
    st.session_state.credits += 1
    drop()

# Spielstart
if 'board' not in st.session_state:
    init()

# Automatisches Fallen mit Pausen-Mechanik
try:
    from streamlit_autorefresh import st_autorefresh
    count = st_autorefresh(interval=500, limit=None, key='f')
    last = st.session_state.get('last_count')
    if count != last:
        st.session_state.last_count = count
        if st.session_state.pause_ticks > 0:
            st.session_state.pause_ticks -= 1
        else:
            fall()
except ImportError:
    st.warning("Für automatisches Fallen: pip install streamlit-autorefresh")

# Temporäres Spielfeld für aktuelle Form
temp = [row.copy() for row in st.session_state.board]
for dx, dy in TETROMINOS[st.session_state.current_piece][st.session_state.rotation]:
    temp[st.session_state.y + dy][st.session_state.x + dx] = st.session_state.current_piece

# Layout: Spielbereich & Info-Bereich nebeneinander
play_col, info_col = st.columns([3, 1])
with play_col:
    render(temp)
    # Steuerungsfeld unter dem Spielfeld
    # Reihenfolge: UP / LEFT-TURN-RIGHT / DROP
    row1 = st.columns([1, 1, 1])
    with row1[1]:
        if st.button("UP", disabled=st.session_state.credits < 1):
            if valid_position(st.session_state.x, st.session_state.y - 1, st.session_state.rotation):
                st.session_state.y -= 1
                st.session_state.credits -= 1
    row2 = st.columns([1, 1, 1])
    with row2[0]: st.button("LEFT") and move(-1, 0)
    with row2[1]: st.button("TURN") and move(0, 1)
    with row2[2]: st.button("RIGHT") and move(1, 0)
    row3 = st.columns([1, 1, 1])
    with row3[1]: st.button("DROP") and droptyped()
with info_col:
    st.write("**Score:**", st.session_state.score)
    st.write("**Credits:**", st.session_state.credits)
    st.write("**Next:**")
    render_next(st.session_state.next_piece)
