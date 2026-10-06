import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'build_puzzles.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class PipelineTests(unittest.TestCase):
    def test_depth_is_not_rating_and_pin_begins_in_step_two(self):
        skills = builder.load_curriculum(ROOT / 'curriculum.js')
        self.assertIn('s2.pin', builder.candidates({'pin'}, 3, skills))
        self.assertNotIn('s4.pinattraction', builder.candidates({'pin'}, 3, skills))
        self.assertIn('s4.pinattraction', builder.candidates({'pin', 'attraction'}, 5, skills))
        self.assertNotIn('s4.pinattraction', builder.candidates({'pin'}, 5, skills))

    def test_legal_import_applies_setup_and_retains_underpromotion(self):
        row = {'PuzzleId': 'test', 'FEN': '7k/P7/8/8/8/8/8/4K3 b - - 0 1',
               'Moves': 'h8g8 a7a8n', 'Rating': '2200', 'Themes': 'promotion', 'GameUrl': ''}
        p = builder.convert(row, ['s5.breakthrough'])
        self.assertEqual(p['solution'], ['a7a8n'])
        self.assertEqual(p['turn'], 'w')
        self.assertEqual(p['level'], 5)
        self.assertEqual(p['classification'], 'candidate')
        self.assertNotIn('curriculum', p)

    def test_false_mate_endpoint_is_rejected(self):
        row = {'PuzzleId': 'bad', 'FEN': '6k1/5Q2/6K1/8/8/8/8/8 b - - 0 1',
               'Moves': 'g8h8 f7e7', 'Rating': '900', 'Themes': 'mateIn1', 'GameUrl': ''}
        self.assertIsNone(builder.convert(row, ['s1.mate']))

    def test_generated_bank_has_distinct_legal_starting_positions_and_candidates(self):
        import chess
        text = (ROOT / 'puzzles.js').read_text()
        puzzles = json.loads(text.split('window.LICHESS_PUZZLES = ', 1)[1].rstrip().removesuffix(';'))
        ids, positions = set(), set()
        for p in puzzles:
            self.assertNotIn(p['id'], ids)
            ids.add(p['id'])
            board = chess.Board(p['fen'])
            self.assertTrue(board.is_valid(), p['id'])
            position = ' '.join(board.fen().split()[:4])
            self.assertNotIn(position, positions)
            positions.add(position)
            self.assertEqual(p['classification'], 'candidate')
            for uci in p['solution']:
                move = chess.Move.from_uci(uci)
                self.assertIn(move, board.legal_moves, p['id'])
                board.push(move)

if __name__ == '__main__':
    unittest.main()
