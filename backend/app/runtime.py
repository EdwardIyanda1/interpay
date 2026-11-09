class _Runtime:
    loop = None
    kick_event = None


R = _Runtime()


def kick():
    """Wake the background worker immediately (thread safe)."""
    if R.loop and R.kick_event:
        R.loop.call_soon_threadsafe(R.kick_event.set)
