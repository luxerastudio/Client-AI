#!/bin/bash

# Port Cleanup Script for AI Client Acquisition System
# Automatically kills processes on ports 3000, 3001, 3002 to prevent EADDRINUSE errors

set -e

PORTS=(3000 3001 3002)
KILLED_COUNT=0

echo "🔧 Checking for processes on ports ${PORTS[*]}..."

for port in "${PORTS[@]}"; do
    # Find process ID using the port
    PID=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$PID" ]; then
        echo "🚫 Port $port is in use by process $PID"
        
        # Get process name for better logging
        PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo "📋 Process: $PROCESS_NAME (PID: $PID)"
        
        # Try to kill the process gracefully first
        echo "🔄 Attempting graceful shutdown..."
        kill $PID 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Check if process is still running
        if kill -0 $PID 2>/dev/null; then
            echo "⚡ Force killing process $PID..."
            kill -9 $PID 2>/dev/null || true
            sleep 1
        fi
        
        # Verify port is now free
        if ! lsof -ti:$port >/dev/null 2>&1; then
            echo "✅ Port $port successfully freed"
            KILLED_COUNT=$((KILLED_COUNT + 1))
        else
            echo "❌ Failed to free port $port"
        fi
    else
        echo "✅ Port $port is free"
    fi
done

echo "🎯 Port cleanup completed. Killed $KILLED_COUNT processes."

# Additional cleanup for any Node.js processes that might be holding ports
echo "🧹 Checking for stray Node.js processes..."
NODE_PIDS=$(pgrep -f "node.*next" || true)
if [ -n "$NODE_PIDS" ]; then
    echo "🚫 Found stray Next.js processes: $NODE_PIDS"
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Cleaned up stray Next.js processes"
fi

# Wait for all processes to fully terminate
sleep 1

echo "🚀 Port cleanup finished. Ready for development servers!"
