import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "./src/screens/HomeScreen";
import FileComplaintScreen from "./src/screens/FileComplaintScreen";
import TrackingScreen from "./src/screens/TrackingScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerTitleStyle: { fontWeight: "900" },
            headerStyle: { backgroundColor: "#fff" },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
          <Tab.Screen
            name="FileComplaint"
            component={FileComplaintScreen}
            options={{ title: "File Complaint", lazy: true }}
          />
          <Tab.Screen name="Tracking" component={TrackingScreen} options={{ title: "Tracking" }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
