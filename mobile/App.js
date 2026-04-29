import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { LanguageProvider, useLanguage } from "./src/i18n";

import HomeScreen from "./src/screens/HomeScreen";
import FileComplaintScreen from "./src/screens/FileComplaintScreen";
import TrackingScreen from "./src/screens/TrackingScreen";
import OrganizationsScreen from "./src/screens/OrganizationsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AuthorityScreen from "./src/screens/AuthorityScreen";

// ─── Navigators ───────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Web deep-link config so page state survives browser refresh ───────────────
const linking = {
  prefixes: ["http://localhost:8081", "http://localhost:19006", "https://janwaaj.app"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home:          "",           // "/"
          FileComplaint: "file",
          Tracking:      "tracking",
          Organizations: "organizations",
          Profile:       "profile",
        },
      },
      Authority: "authority-login",
    },
  },
};

// ── Bottom tab navigator ──────────────────────────────────────────────────────

function MainTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleStyle: { fontWeight: "900", fontSize: 17 },
        headerStyle: { backgroundColor: "#fff" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e2e8f0",
          paddingBottom: 4,
          height: 58,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:          focused ? "home"          : "home-outline",
            FileComplaint: focused ? "document-text" : "document-text-outline",
            Tracking:      focused ? "list"          : "list-outline",
            Organizations: focused ? "people"        : "people-outline",
            Profile:       focused ? "person"        : "person-outline",
          };
          return <Ionicons name={icons[route.name] || "ellipse-outline"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t("appTitle"), tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="FileComplaint"
        component={FileComplaintScreen}
        options={{ title: t("submitComplaint"), tabBarLabel: "File", lazy: true }}
      />
      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: "Tracking", tabBarLabel: "Track" }}
      />
      <Tab.Screen
        name="Organizations"
        component={OrganizationsScreen}
        options={{ title: "Partners", tabBarLabel: "Orgs" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

// ── Root stack (MainTabs + Authority deep-linked screen) ─────────────────────

function RootStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Authority"
        component={AuthorityScreen}
        options={{
          headerShown: true,
          title: "Authority Portal",
          headerStyle: { backgroundColor: "#0f766e" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "900" },
          // Back button appears automatically via native stack
        }}
      />
    </Stack.Navigator>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <LanguageProvider>
      <StatusBar style="dark" />
      <NavigationContainer linking={linking}>
        <RootStack />
      </NavigationContainer>
    </LanguageProvider>
  );
}
