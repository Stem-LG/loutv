import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ReactPlayer, { Config } from "react-player";
import { Button } from "@/components/ui/button";

export default function PlayerPage() {
    const navigate = useNavigate();
    const { url } = useParams<{ url: string }>();
    const playerRef = useRef<ReactPlayer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<number>();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "f":
                case "F":
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case "Escape":
                    if (isFullscreen) {
                        document.exitFullscreen();
                    } else {
                        navigate(-1);
                    }
                    break;
                case "Backspace":
                    e.preventDefault();
                    navigate(-1);
                    break;
            }

            // Show controls on any key press
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                window.clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = window.setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            if (controlsTimeoutRef.current) {
                window.clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [navigate, isFullscreen]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const getPlayerConfig = (): Config => {
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isTS = url?.toLowerCase().endsWith(".ts");

        if (isAndroid && isTS) {
            return {
                file: {
                    attributes: {
                        crossOrigin: "anonymous",
                        playsInline: true,
                    },
                    hlsOptions: {
                        enableWorker: true,
                        lowLatencyMode: true,
                    },
                    forceHLS: true,
                },
            };
        }

        return {
            file: {
                forceVideo: true,
                attributes: {
                    crossOrigin: "anonymous",
                },
            },
        };
    };

    if (!url) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-screen h-screen bg-black"
            onMouseMove={() => {
                setShowControls(true);
                if (controlsTimeoutRef.current) {
                    window.clearTimeout(controlsTimeoutRef.current);
                }
                controlsTimeoutRef.current = window.setTimeout(() => {
                    setShowControls(false);
                }, 3000);
            }}
        >
            <ReactPlayer
                ref={playerRef}
                url={decodeURIComponent(url)}
                width="100%"
                height="100%"
                playing
                controls
                config={getPlayerConfig()}
            />

            {/* Overlay controls */}
            <div
                className={`absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                }`}
            >
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
