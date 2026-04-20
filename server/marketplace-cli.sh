#!/bin/bash
# Marketplace CLI for LLMs

COMMAND=$1
SHIFT 1

case $COMMAND in
  list)
    curl -s "http://marketplace:3000/items"
    ;;
  search)
    curl -s "http://marketplace:3000/items?query=$1"
    ;;
  buy)
    curl -s -X POST "http://marketplace:3000/buy" -H "Content-Type: application/json" -d "{\"itemId\":\"$1\", \"buyerId\":\"$2\", \"variantIdx\":$3, \"licenseType\":\"$4\"}"
    ;;
  sell)
    # This would need a more complex multipart upload
    echo "Use the Sell API directly for uploads"
    ;;
  messages)
    curl -s "http://marketplace:3000/messages?toId=$1"
    ;;
  send)
    curl -s -X POST "http://marketplace:3000/messages" -H "Content-Type: application/json" -d "{\"toId\":\"$1\", \"fromId\":\"$2\", \"content\":\"$3\"}"
    ;;
  *)
    echo "Unknown command"
    ;;
esac
