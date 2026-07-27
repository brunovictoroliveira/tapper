import numpy as np

from app.analyzer import MAJOR_PROFILE, MINOR_PROFILE, detect_key_from_chroma


def test_detects_c_major_profile():
    result = detect_key_from_chroma(MAJOR_PROFILE)
    assert result[0]['tonic'] == 'C'
    assert result[0]['mode'] == 'major'


def test_detects_shifted_a_minor_profile():
    a_minor = np.roll(MINOR_PROFILE, 9)
    result = detect_key_from_chroma(a_minor)
    assert result[0]['tonic'] == 'A'
    assert result[0]['mode'] == 'minor'
    assert result[0]['camelot'] == '8A'
