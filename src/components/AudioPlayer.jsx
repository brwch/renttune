import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import './AudioPlayer.css';

const AudioPlayer = ({ audioUrl, title }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    // Inicjalizacja audio
    useEffect(() => {
        audioRef.current = new Audio();
        
        const updateProgress = () => {
            if (audioRef.current) {
                const newProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                setProgress(newProgress || 0);
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audioRef.current.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setProgress(0);
        };

        audioRef.current.addEventListener('timeupdate', updateProgress);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.addEventListener('ended', handleEnded);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('timeupdate', updateProgress);
                audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current = null;
            }
        };
    }, []);

    // Obsługa zmiany źródła audio
    useEffect(() => {
        if (!audioUrl) return;

        // Jeśli źródło się zmieniło, resetujemy odtwarzanie
        if (audioRef.current.src !== audioUrl) {
            audioRef.current.src = audioUrl;
            setCurrentTime(0);
            setProgress(0);
            setIsPlaying(false);
        }
    }, [audioUrl]);

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            // Jeśli audio nie jest załadowane, ustawiamy źródło
            if (!audioRef.current.src) {
                audioRef.current.src = audioUrl;
            }
            
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(error => {
                    console.error('Błąd odtwarzania:', error);
                    setIsPlaying(false);
                });
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        
        const seekPosition = e.nativeEvent.offsetX / e.target.offsetWidth;
        const seekTime = seekPosition * duration;
        
        audioRef.current.currentTime = seekTime;
        setProgress(seekPosition * 100);
        setCurrentTime(seekTime);

        // Automatyczne wznowienie odtwarzania jeśli było włączone
        if (isPlaying) {
            audioRef.current.play().catch(error => {
                console.error('Błąd wznowienia odtwarzania:', error);
                setIsPlaying(false);
            });
        }
    };

    return (
        <div className="audio-player">
            <button
                className={`play-button ${isPlaying ? 'playing' : ''}`}
                onClick={togglePlayback}
                disabled={!audioUrl}
                aria-label={isPlaying ? 'Zatrzymaj' : 'Odtwórz'}
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="audio-info">
                <span className="audio-title">{title || 'Próbka audio'}</span>
                <div 
                    className="audio-progress"
                    onClick={handleSeek}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                        className="audio-progress-bar"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="audio-time">
                    <span>{formatTime(currentTime)}</span>
                    <span> / </span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

// Funkcja pomocnicza do formatowania czasu
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default AudioPlayer;