import wave
import struct
import io
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

def run_test():
    # 1. Generate 2-second sine wave audio
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        for i in range(32000):
            val = int(32767.0 * 0.1 * ((i % 100) / 100.0))
            wf.writeframesraw(struct.pack('<h', val))
    buf.seek(0)

    client = TestClient(app)
    res = client.post(
        '/api/upload',
        files={'file': ('test_audio.wav', buf.getvalue(), 'audio/wav')},
        data={'title': 'Sprint Planning Audio Note', 'language_code': 'en-IN'}
    )
    print('Upload response status:', res.status_code)
    data = res.json()
    print('Upload response data:', data)
    note_id = data['id']

    # 2. Poll job status
    for i in range(15):
        time.sleep(1)
        st = client.get(f'/api/jobs/{note_id}').json()
        print(f"Poll {i+1}: status={st.get('status')}, progress={st.get('progress_percent')}%, msg={st.get('progress_message')}")
        if st.get('status') in ('COMPLETED', 'FAILED'):
            break

    # 3. Verify final note details
    note_detail = client.get(f'/api/notes/{note_id}').json()
    print('--- NOTE DETAIL RESULT ---')
    print('ID:', note_detail.get('id'))
    print('Status:', note_detail.get('status'))
    print('Duration (s):', note_detail.get('duration_seconds'))
    print('Transcript:', note_detail.get('transcript_text')[:100], '...')
    print('TL;DR:', note_detail.get('summary_tldr'))
    print('Action items count:', len(note_detail.get('summary_action_items', [])))
    print('Key points count:', len(note_detail.get('summary_key_points', [])))
    print('SUCCESS! Backend pipeline verified.')

if __name__ == '__main__':
    run_test()
