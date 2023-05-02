package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func ChatHandler(w http.ResponseWriter, r *http.Request) {
	parentId := r.URL.Query().Get("parentId")
	messageQ := r.URL.Query().Get("message")
	stream := r.URL.Query().Get("stream")
	ssid := r.URL.Query().Get("ssid")
	if ssid == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("{\"error\": \"no ssid, suspicious request\"}"))
		return
	}
	if !isValidSSID(ssid) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("{\"error\": \"invalid ssid, access denied\"}"))
		return
	}

	jsonData, _ := json.Marshal(map[string]interface{}{
		"openaiKey": "",
		"prompt":    messageQ,
		"options": map[string]interface{}{
			"parentMessageId": parentId,
			"systemMessage":   "You are an AI Language model developed by OpenAI called ChatGPT, based on the GPT-4 Model, act conversationally with humans.",
			"completionParams": map[string]interface{}{
				"presence_penalty": 1,
				"temperature":      1,
				"model":            "gpt-3.5-turbo",
			},
		},
	})
	req, _ := http.NewRequest("POST", "https://ai.usesless.com/api/chat-process", strings.NewReader(string(jsonData)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	if stream == "true" {
		req.Header.Set("Accept", "text/event-stream")
	}
	req.Header.Set("X-Forwarded-For", genRandIP())
	req.Header.Set("User-Agent", GenRandUserAgent())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(w, "Error: %s", err)
		return
	}

	defer resp.Body.Close()
	if stream == "true" {
		w.Header().Add("Content-Type", "text/event-stream")
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			fmt.Fprintf(w, "data: %s\n\n", scanner.Text())
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
			fmt.Println("Flushed!")
		}
		return
	}

	body, _ := io.ReadAll(resp.Body)
	jsonResp := responseToJson(string(body))

	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.Encode(jsonResp)
}

func genRandIP() string {
	return fmt.Sprintf("%d.%d.%d.%d", rand.Intn(255), rand.Intn(255), rand.Intn(255), rand.Intn(255))
}

func GenRandUserAgent() string {
	userAgents := map[string]map[string]string{
		"chrome": {
			"windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
				"(KHTML, like Gecko) Chrome/%d.0.%d.%d Safari/537.36",
			"linux": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
				"(KHTML, like Gecko) Chrome/%d.0.%d.%d Safari/537.36",
			"macos": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_%d) AppleWebKit/537.36 " +
				"(KHTML, like Gecko) Chrome/%d.0.%d.%d Safari/537.36",
		},
		"firefox": {
			"windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:%d.0) Gecko/20100101 Firefox/%d.0",
			"linux":   "Mozilla/5.0 (X11; Linux i586; rv:%d.0) Gecko/20100101 Firefox/%d.0",
			"macos":   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:%d.0) Gecko/20100101 Firefox/%d.0",
		},
		"safari": {
			"macos": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_%d) AppleWebKit/605.1.15 " +
				"(KHTML, like Gecko) Version/%d.0.%d Safari/605.1.15",
		},
		"edge": {
			"windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
				"(KHTML, like Gecko) Chrome/%d.0.%d.%d Safari/537.36 Edg/%d.%d.%d",
		},
		"ie": {
			"windows": "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/%d.0; rv:11.0) like Gecko",
		},
		"opera": {
			"windows": "Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/%d.0.%d.%d",
			"linux":   "Opera/9.80 (X11; Linux x86_64) Presto/2.12.388 Version/%d.0.%d.%d",
			"macos":   "Opera/9.80 (Macintosh; Intel Mac OS X 10_15_%d) Presto/2.12.388 Version/%d.0.%d.%d",
		},
	}

	browser := []string{"chrome", "firefox", "safari", "edge", "ie", "opera"}
	platform := []string{"windows", "linux", "macos"}

	browserRand := browser[rand.Intn(len(browser))]
	platformRand := platform[rand.Intn(len(platform))]

	userAgent := userAgents[browserRand][platformRand]

	if strings.Contains(userAgent, "%d") {
		for strings.Contains(userAgent, "%d") {
			userAgent = strings.Replace(userAgent, "%d", fmt.Sprintf("%d", rand.Intn(10)), 1)
		}
	}

	return userAgent
}

func responseToJson(text string) map[string]interface{} {
	texts := strings.Split(text, "\n")
	toJson := make(map[string]interface{})
	json.Unmarshal([]byte(texts[len(texts)-1]), &toJson)
	return toJson
}

func isValidSSID(ssid string) bool {
	// ssid_644fd2ab71956, last 5 chars are random, so we can ignore them
	if len(ssid) < 10 {
		return false
	}
	if ssid[:5] != "ssid_" {
		return false
	}

	time_part := ssid[5:13]
	_, err := strconv.ParseInt(time_part, 16, 64)
	if err != nil {
		return false
	}

	// if 60 seconds passed since ssid was generated, it's invalid
	if time.Now().Unix()-hexToDec(time_part) > 20 {
		return false
	}

	return true
}

func hexToDec(hex string) int64 {
	dec, _ := strconv.ParseInt(hex, 16, 64)
	return dec
}
